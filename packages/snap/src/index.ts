import {
  OnRpcRequestHandler,
  OnTransactionHandler,
} from '@metamask/snap-types';
import * as mmutils from '@metamask/utils';
import { FourByteSignature, FOUR_BYTE_API_ENDPOINT } from './utils';
/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
export const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns `null` if the request succeeded.
 * @throws If the request method is not valid for this snap.
 * @throws If the `snap_confirm` call failed.
 */
export const onRpcRequest: OnRpcRequestHandler = ({ origin, request }) => {
  switch (request.method) {
    case 'hello':
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: getMessage(origin),
            description:
              'This custom confirmation is just for display purposes.',
            textAreaContent:
              'But you can edit the snap source code to make it do something, if you want to!',
          },
        ],
      });
    default:
      throw new Error('Method not found.');
  }
};

export const onTransaction: OnTransactionHandler = async ({
  transaction,
  chainId,
}) => {
  if (!transaction || !chainId) {
    throw Error('transaction or chainId cant be null');
  }

  if (!mmutils.isHexString(transaction.data)) {
    throw Error('transaction data is not a valid hex string');
  }
  const hexSignature = transaction.data.slice(0, 10);
  const fourByteSignatureResponse = await fetch(
    `${FOUR_BYTE_API_ENDPOINT}${hexSignature}`,
    {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!fourByteSignatureResponse.ok) {
    throw Error(
      `hex signature response is not ok for this signature : ${hexSignature}, status: ${fourByteSignatureResponse.status} `,
    );
  }
  // to do : get proper insights somewhere
  // ex : https://www.4byte.directory/api/v1/signatures/?format=api&hex_signature=0x83ade3dc
  const { results } = (await fourByteSignatureResponse.json()) as {
    results: FourByteSignature[];
  };

  return {
    insights: {
      transaction,
      chainId,
      transactionData: {
        ...results,
      },
    },
  };
};
