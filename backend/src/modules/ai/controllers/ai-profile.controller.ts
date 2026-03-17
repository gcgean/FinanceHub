import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  tone: z.enum(["formal", "casual", "technical"]).optional(),
  level: z.enum(["summary", "detailed"]).optional(),
  segment: z.enum(["GENERIC", "SOFTWARE", "RETAIL", "INDUSTRY", "SERVICES"]).optional(),
});

export class AIProfileController {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };

    let profile = await prisma.aIProfile.findUnique({
      where: { companyId }
    });

    if (!profile) {
      profile = await prisma.aIProfile.create({
        data: { companyId }
      });
    }

    return reply.send(profile);
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const { companyId } = request.user as { companyId: string };
    
    // @ts-ignore
    const body = UpdateProfileSchema.parse(request.body);

    const profile = await prisma.aIProfile.upsert({
      where: { companyId },
      create: {
        companyId,
        ...body
      },
      update: {
        ...body
      }
    });

    return reply.send(profile);
  }
}

export const aiProfileController = new AIProfileController();
