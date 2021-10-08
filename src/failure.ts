import {Either} from "./either";

export interface Failure<Code extends string, Body> {
  code: Code,
  message?: string,
  body?: Body,
  trace: string,
}

export function fail<Code extends string, Body>(code: Code, message?: any, body?: Body, internalLog?: string): Failure<Code, Body> {
  internalLog !== undefined && console.error(internalLog);

  return {
    code: code,
    message: message === undefined || typeof message === "string" ? message : JSON.stringify(message),
    body: body,
    trace: (new Error()).stack!,
  }
}
