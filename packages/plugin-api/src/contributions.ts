export interface ExportFormatContribution {
	id: string;
	label: string;
	extension: string;
	export(documentId: string): void | Promise<void>;
}
