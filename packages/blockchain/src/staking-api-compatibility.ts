// Compile-only checks against the pinned public SDK. No SDK instance or wallet call.
import type { Token, WrappedToken, ZamaSDK } from '@zama-fhe/sdk';
import type { Address, Hex } from 'viem';

type Assert<T extends true> = T;
export type DepositCallbackAPI = Assert<
  [Address, bigint, Hex] extends Parameters<
    Token['confidentialTransferAndCall']
  >
    ? true
    : false
>;
export type OperatorApprovalAPI = Assert<
  [Address, number] extends Parameters<Token['setOperator']> ? true : false
>;
export type ExactUnderlyingApprovalAPI = Assert<
  [bigint, { approvalStrategy: 'exact' }] extends Parameters<
    WrappedToken['shield']
  >
    ? true
    : false
>;
export type WrapperFactoryAPI = Assert<
  ReturnType<ZamaSDK['createWrappedToken']> extends WrappedToken ? true : false
>;
