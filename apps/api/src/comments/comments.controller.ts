import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('orders/:orderId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async getComments(@Request() req: any, @Param('orderId') orderId: string) {
    const comments = await this.commentsService.getByOrder(req.user.tenantId, orderId);
    return { items: comments };
  }

  @Post()
  async addComment(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body() body: { content: string; mentions?: string[] },
  ) {
    const comment = await this.commentsService.add(
      req.user.tenantId,
      orderId,
      req.user.sub,
      body.content,
      body.mentions || [],
    );
    return comment;
  }

  @Delete(':commentId')
  async deleteComment(
    @Request() req: any,
    @Param('orderId') _orderId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.commentsService.delete(req.user.tenantId, commentId, req.user.sub);
    return { success: true };
  }
}
