import { decode } from '@metamask/abi-utils';
import { add0x, bytesToHex, Json, remove0x } from '@metamask/utils';

// The API endpoint to get a list of functions by 4 byte signature.
export const FOUR_BYTE_API_ENDPOINT =
  'https://www.4byte.directory/api/v1/signatures/?hex_signature=';

/* eslint-disable camelcase */
export type FourByteSignature = {
  id: number;
  created_at: string;
  text_signature: string;
  hex_signature: string;
  bytes_signature: string;
};
/* eslint-enable camelcase */

/**
 * The ABI decoder returns certain which are not JSON serializable. This
 * function converts them to strings.
 *
 * @param value - The value to convert.
 * @returns The converted value.
 */
export function normalizeValue(value: unknown): Json {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value instanceof Uint8Array) {
    return bytesToHex(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value as Json;
}

/**
 * Get function details from a 4byte hex signature
 *
 * @param fourByteFunctionSelector - Ethereum Contract ABI four byte function selector.
 * @returns human readable function signature.
 * @see https://www.4byte.directory/api/v1/signatures/?format=api&hex_signature=0x83ade3dc
 */
export async function getFunctionSignatureDetails(
  fourByteFunctionSelector: string,
): Promise<FourByteSignature> {
  const functionDetailsResponse = await fetch(
    `${FOUR_BYTE_API_ENDPOINT}${fourByteFunctionSelector}`,
    {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!functionDetailsResponse.ok) {
    throw Error(
      `Function signature response is not ok for this four byte function selector : ${fourByteFunctionSelector}, status: ${functionDetailsResponse.status} `,
    );
  }

  const { results } = (await functionDetailsResponse.json()) as {
    results: FourByteSignature[];
  };

  // sort descending by created_at date and take the first function signature for this function selector
  const result = results
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .find((x) => x.hex_signature === fourByteFunctionSelector);
  if (!result) {
    throw new Error(
      `Could not find a function signature for this  4-byte function selector : ${fourByteFunctionSelector}`,
    );
  }
  return result;
}

export const getFunctionInsights = async (transactionData: string) => {
  const data = remove0x(transactionData);

  const functionSelector = data.slice(0, 8);
  const functionSignature = await getFunctionSignatureDetails(
    add0x(functionSelector),
  );

  // ex : "text_signature": "updateWithdrawalAccount(address[],bool)"
  const parametersTypes = functionSignature.text_signature
    .slice(
      functionSignature.text_signature.indexOf('(') + 1,
      functionSignature.text_signature.indexOf(')'),
    )
    .split(',');
  parametersTypes.map(console.warn);

  const decodedParams = decode(
    parametersTypes,
    add0x(functionSelector.slice(8)),
  );
  decodedParams.map(console.warn);
  if (parametersTypes.length !== decodedParams.length) {
    throw Error(
      `Parameters types list doesn't match with the decoded parameters list `,
    );
  }

  // parametersTypes.map((value, iterator) => {
  //   return console.warn(`${value}:${decodedParams[iterator]}`);
  //   // return [value, decodedParams[iterator]];
  // });
  return {
    function: functionSignature.text_signature,
    parameters: decodedParams.map(normalizeValue),
  };
};
