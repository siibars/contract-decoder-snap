import {
  OnRpcRequestHandler,
  OnTransactionHandler,
} from '@metamask/snap-types';
import { add0x, isHexString } from '@metamask/utils';
import { decode } from '@metamask/abi-utils';

import { getFunctionSignatureDetails } from './utils';
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

  if (!isHexString(transaction.data)) {
    throw Error('transaction data is not a valid hex string');
  }

  const functionSelector = transaction.data.slice(0, 10);
  const functionSignature = await getFunctionSignatureDetails(functionSelector);

  // ex : "text_signature": "updateWithdrawalAccount(address[],bool)"
  const parametersTypes = functionSignature.text_signature
    .slice(
      functionSignature.text_signature.indexOf('(') + 1,
      functionSignature.text_signature.indexOf(')'),
    )
    .split(',');

  try {
    decode(parametersTypes, add0x(functionSelector));
    // console.warn(
    //   `!!!!! decodedParams : ${normalizeAbiValue(decodedParams)?.toString()}`,
    // );
  } catch (error) {
    console.error(error);
  }

  return {
    insights: {
      transaction,
      chainId,
      transactionData: {
        ...functionSignature,
      },
    },
  };
};
