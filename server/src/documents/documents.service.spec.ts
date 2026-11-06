import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsService } from "./documents.service";
import { DocumentsStore } from "./documents.store";

describe("DocumentsService", () => {
  let moduleRef: TestingModule;
  let service: DocumentsService;
  let store: DocumentsStore;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [DocumentsService, DocumentsStore],
    }).compile();

    await moduleRef.init();

    service = moduleRef.get(DocumentsService);
    store = moduleRef.get(DocumentsStore);
  });

  it("returns the full list of documents", async () => {
    const documents = await service.findAll();

    expect(documents).toHaveLength(20);
    expect(documents[0]).toMatchObject({
      id: "doc-01",
      title: "Q3 Vendor Agreement",
    });
  });

  it("creates a document with the given title", async () => {
    const created = await service.create("Renewal Terms — Acme");

    expect(created.title).toBe("Renewal Terms — Acme");
    expect(created.lockedBy).toBeNull();
    expect(created.id).toBeTruthy();
  });

  it("deletes an unlocked document", async () => {
    await service.delete("doc-01");

    expect(store.findById("doc-01")).toBeUndefined();
    expect(store.all()).toHaveLength(19);
  });

  it("includes a newly created document in findAll", async () => {
    const created = await service.create("Renewal Terms — Acme");
    const documents = await service.findAll();

    expect(documents).toHaveLength(21);
    expect(documents.map((doc) => doc.id)).toContain(created.id);
  });

  it("excludes a deleted document from findAll", async () => {
    await service.delete("doc-01");
    const documents = await service.findAll();

    expect(documents).toHaveLength(19);
    expect(documents.map((doc) => doc.id)).not.toContain("doc-01");
  });

  it("throws ConflictException and keeps a locked document", async () => {
    await expect(service.delete("doc-03")).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(store.findById("doc-03")).toBeDefined();
    expect(await service.findAll()).toHaveLength(20);
  });

  it("throws NotFoundException for an unknown id", async () => {
    await expect(service.delete("doc-999")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("ignores remove() for an unknown id", () => {
    store.remove("doc-999");
    expect(store.all()).toHaveLength(20);
  });
});
