import {
  decodeCustomModelValue as decodeSharedCustomModelValue,
  encodeCustomModelValue as encodeSharedCustomModelValue,
} from "@kcode/shared";

interface DecodedCustomModelValue {
  providerId: string;
  modelName?: string;
}

export function encodeCustomModelValue(providerId: string, modelName?: string): string {
  return encodeSharedCustomModelValue(providerId, modelName);
}

export function decodeCustomModelValue(value: string): DecodedCustomModelValue | null {
  return decodeSharedCustomModelValue(value);
}
