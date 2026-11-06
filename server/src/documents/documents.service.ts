import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Document } from "./document.model";
import { DocumentsStore } from "./documents.store";

@Injectable()
export class DocumentsService implements OnModuleInit {
  private documentsCache: Document[] = [];

  constructor(private readonly store: DocumentsStore) {}

  // The list endpoint is hit on every page load and the document set is small,
  // so we keep a ready-to-serve copy in memory instead of rebuilding it per request.
  onModuleInit(): void {
    this.documentsCache = this.store.all();
  }

  // add a refreshCache function to update the cache after a document is created or deleted
  private refreshCache(): void {
    this.documentsCache = this.store.all();
  }

  async findAll(): Promise<Document[]> {
    return this.documentsCache;
  }

  // added a create function to insert a new document into the store and refresh the cache.
  async create(title: string): Promise<Document> {
    const document = this.store.insert(title);
    this.refreshCache();

    return document;
  }

  async delete(id: string): Promise<void> {
    const document = this.store.findById(id);

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    if (document.lockedBy !== null) {
      throw new ConflictException(
        `Document ${id} is locked by ${document.lockedBy}`,
      );
    }

    this.store.remove(id);
    this.refreshCache();
  }
}
