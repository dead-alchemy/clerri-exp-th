import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  @Post()
  async create(@Body() dto: { title: string }) {
    return this.documentsService.create(dto.title);
  }

  @Post("bulk-delete")
  async bulkDelete(@Body() dto: { ids: string[] }) {
    const deleted: string[] = [];
    const locked: string[] = [];
    const notFound: string[] = [];

    // instead of using Promise.all, we want to process each deletion sequentially so that we can categorize the errors
    for (const id of dto.ids) {
      try {
        await this.documentsService.delete(id);
        deleted.push(id);
      } catch (error) {
        // two potential errors can occur when deleting a document: it can be locked or it can not exist. We want to categorize the errors so that we can return a useful response to the client.
        if (error instanceof ConflictException) {
          locked.push(id);
        } else if (error instanceof NotFoundException) {
          notFound.push(id);
        } else {
          throw error;
        }
      }
    }

    // updating the response to include a success flag that indicates whether all deletions were successful. If any document was locked or not found, the success flag will be false.
    return {
      success: locked.length === 0 && notFound.length === 0,
      deleted,
      locked,
      notFound,
    };
  }
}
