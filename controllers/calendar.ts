import { Request, Response } from "express";
import Boom from "@hapi/boom";
import { google } from "googleapis";
import config from "config";
import prisma from "../prisma/prisma";
import { apiResponse, calendarResponse } from "../@types/apiReponse";

const gcalClientId = config.get("providers.googleOauth20.clientId");
const gcalClientSecret = config.get("providers.googleOauth20.clientSecret");
const calApiUrl = config.get("services.calendarApi.baseUrl");

const oauth2Client = new google.auth.OAuth2(
  String(gcalClientId),
  String(gcalClientSecret),
  `${String(calApiUrl)}/api/v1/calendar/google/callback`
);

const scopes = ["https://www.googleapis.com/auth/calendar"];

const googleConnectHandler = (_: Request, res: Response): void => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });

  return res.redirect(url);
};

const googleCallbackHandler = (_: Request, res: Response): void => {
  const redirectUrl = `${String(
    config.get("services.rCalUi.baseUrl")
  )}/onboarding`;

  return res.redirect(redirectUrl);
};

const getUserCalendar = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { username } = req.params;

    if (req.userData?.username === username) {
      const userCalendars: calendarResponse[] = await prisma.calendar.findMany({
        where: {
          ownerId: req.userData.id,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          isPrimary: true,
        },
      });

      const response: apiResponse<calendarResponse[]> = {
        data: userCalendars,
      };

      return res.json(response);
    }

    logger.error(
      "User does have permission to get calender, as req.userData.username !== req.params.username"
    );

    return res.boom(Boom.forbidden(config.get("messages.forbidden")));
  } catch (err) {
    logger.error("Error while fetching user calendar data", { err });
    return res.boom(Boom.badImplementation());
  }
};

export { googleConnectHandler, googleCallbackHandler, getUserCalendar };
