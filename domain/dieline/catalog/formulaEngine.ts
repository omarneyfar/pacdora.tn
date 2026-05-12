export type FormulaEvaluationResult = {
  ok: boolean;
  value: number;
  warnings: string[];
};

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

const MAX_FORMULA_LENGTH = 160;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function evaluateFormula(
  formula: string,
  context: Record<string, unknown>,
  fallback = 0,
): FormulaEvaluationResult {
  try {
    if (!formula || formula.length > MAX_FORMULA_LENGTH) {
      return failed(fallback, `Formula is empty or too long: ${formula}`);
    }

    const parser = new FormulaParser(tokenize(formula), context);
    const value = parser.parse();

    if (!Number.isFinite(value)) {
      return failed(fallback, `Formula did not resolve to a finite number: ${formula}`);
    }

    return { ok: true, value, warnings: parser.warnings };
  } catch (error) {
    return failed(fallback, error instanceof Error ? error.message : `Could not evaluate formula: ${formula}`);
  }
}

export function extractFormulaReferences(formula: string): string[] {
  if (!formula || formula.length > MAX_FORMULA_LENGTH) {
    return [];
  }

  const tokens = tokenize(formula);
  const functions = new Set(["min", "max", "clamp"]);
  const refs = tokens
    .filter((token): token is { type: "identifier"; value: string } => token.type === "identifier")
    .map((token) => token.value)
    .filter((identifier) => !functions.has(identifier));

  return Array.from(new Set(refs));
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const char = input[cursor];

    if (/\s/.test(char)) {
      cursor += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const start = cursor;
      cursor += 1;
      while (cursor < input.length && /[0-9.]/.test(input[cursor])) {
        cursor += 1;
      }

      const value = Number(input.slice(start, cursor));
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number in formula: ${input.slice(start, cursor)}`);
      }

      tokens.push({ type: "number", value });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = cursor;
      cursor += 1;
      while (cursor < input.length && /[A-Za-z0-9_]/.test(input[cursor])) {
        cursor += 1;
      }

      const value = input.slice(start, cursor);
      if (!IDENTIFIER_PATTERN.test(value)) {
        throw new Error(`Invalid identifier in formula: ${value}`);
      }

      tokens.push({ type: "identifier", value });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char });
      cursor += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      cursor += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      cursor += 1;
      continue;
    }

    throw new Error(`Unsupported token in formula: ${char}`);
  }

  return tokens;
}

class FormulaParser {
  public warnings: string[] = [];
  private cursor = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: Record<string, unknown>,
  ) {}

  parse(): number {
    const value = this.parseExpression();
    if (this.peek()) {
      throw new Error("Unexpected trailing formula tokens.");
    }

    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();

    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previous() as Token & { type: "operator" };
      const right = this.parseTerm();
      value = operator.value === "+" ? value + right : value - right;
    }

    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();

    while (this.matchOperator("*") || this.matchOperator("/")) {
      const operator = this.previous() as Token & { type: "operator" };
      const right = this.parseFactor();

      if (operator.value === "/" && Math.abs(right) < 0.0000001) {
        throw new Error("Division by zero in formula.");
      }

      value = operator.value === "*" ? value * right : value / right;
    }

    return value;
  }

  private parseFactor(): number {
    if (this.matchOperator("-")) {
      return -this.parseFactor();
    }

    if (this.matchOperator("+")) {
      return this.parseFactor();
    }

    const token = this.advance();

    if (!token) {
      throw new Error("Unexpected end of formula.");
    }

    if (token.type === "number") {
      return token.value;
    }

    if (token.type === "identifier") {
      if (this.matchParen("(")) {
        return this.parseFunctionCall(token.value);
      }

      const value = Number(this.context[token.value]);
      if (!Number.isFinite(value)) {
        this.warnings.push(`Formula reference "${token.value}" is missing; using 0.`);
        return 0;
      }

      return value;
    }

    if (token.type === "paren" && token.value === "(") {
      const value = this.parseExpression();
      this.expectParen(")");
      return value;
    }

    throw new Error("Unexpected formula token.");
  }

  private parseFunctionCall(name: string): number {
    const args: number[] = [];

    if (!this.checkParen(")")) {
      do {
        args.push(this.parseExpression());
      } while (this.matchComma());
    }

    this.expectParen(")");

    if (name === "min" && args.length >= 1) {
      return Math.min(...args);
    }

    if (name === "max" && args.length >= 1) {
      return Math.max(...args);
    }

    if (name === "clamp" && args.length === 3) {
      return Math.min(args[2], Math.max(args[1], args[0]));
    }

    throw new Error(`Unsupported formula function: ${name}`);
  }

  private matchOperator(value: "+" | "-" | "*" | "/"): boolean {
    if (this.check("operator", value)) {
      this.cursor += 1;
      return true;
    }

    return false;
  }

  private matchParen(value: "(" | ")"): boolean {
    if (this.check("paren", value)) {
      this.cursor += 1;
      return true;
    }

    return false;
  }

  private expectParen(value: "(" | ")") {
    if (!this.matchParen(value)) {
      throw new Error(`Expected "${value}" in formula.`);
    }
  }

  private matchComma(): boolean {
    if (this.peek()?.type === "comma") {
      this.cursor += 1;
      return true;
    }

    return false;
  }

  private check(type: Token["type"], value?: string): boolean {
    const token = this.peek();
    return Boolean(token && token.type === type && (value === undefined || "value" in token && token.value === value));
  }

  private checkParen(value: "(" | ")"): boolean {
    return this.check("paren", value);
  }

  private advance(): Token | undefined {
    const token = this.peek();
    if (token) {
      this.cursor += 1;
    }

    return token;
  }

  private previous(): Token | undefined {
    return this.tokens[this.cursor - 1];
  }

  private peek(): Token | undefined {
    return this.tokens[this.cursor];
  }
}

function failed(value: number, warning: string): FormulaEvaluationResult {
  return { ok: false, value, warnings: [warning] };
}
