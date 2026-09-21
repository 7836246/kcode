export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "note"; text: string };

export type DocPage = {
  title: string;
  lead: string;
  blocks: DocBlock[];
};
