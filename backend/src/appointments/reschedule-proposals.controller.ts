import { Body, Controller, Post } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import { RespondRescheduleProposalDto } from "./dto/respond-reschedule-proposal.dto";
@Controller("appointments/reschedule-proposals")
export class RescheduleProposalsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}
  @Post("accept") accept(@Body() dto: RespondRescheduleProposalDto) {
    return this.appointmentsService.acceptRescheduleProposal(dto.token);
  }
  @Post("reject") reject(@Body() dto: RespondRescheduleProposalDto) {
    return this.appointmentsService.rejectRescheduleProposal(dto.token);
  }
}
