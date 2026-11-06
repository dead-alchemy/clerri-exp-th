import { Injectable } from "@nestjs/common";
import { Document } from "./document.model";
import { SEED_DOCUMENTS } from "./seed";

/**
 * In-memory stand-in for the document repository. Everything lives in
 * process memory, so restarting the server resets the data set.
 */
@Injectable()
export class DocumentsStore {
  private readonly documents: Document[] = SEED_DOCUMENTS.map((doc) => ({
    ...doc,
  }));
  private nextId = SEED_DOCUMENTS.length + 1;

  all(): Document[] {
    return this.documents.map((doc) => ({
      ...doc,
    }));
  }

  findById(id: string): Document | undefined {
    return this.documents.find((doc) => doc.id === id);
  }

  insert(title: string): Document {
    const document: Document = {
      id: `doc-${String(this.nextId++).padStart(2, "0")}`,
      title,
      updatedAt: new Date().toISOString(),
      lockedBy: null,
    };

    this.documents.push(document);
    return { ...document };
  }

  // added a check to make sure the index is valid before splicing the array. If the index is -1, it means the document was not found and we don't want to modify the array.
  remove(id: string): void {
    const index = this.documents.findIndex((doc) => doc.id === id);
    if (index !== -1) this.documents.splice(index, 1);
  }
}
