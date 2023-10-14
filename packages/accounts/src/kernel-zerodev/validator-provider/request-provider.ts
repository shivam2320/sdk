import {
  ValidatorProvider,
  type ExtendedValidatorProviderParams,
} from "./base.js";
import {
  RequestValidator,
  type RequestValidatorParams,
} from "../validator/request-validator.js";
import { getChain, type SendUserOperationResult } from "@alchemy/aa-core";
import { getChainId } from "../api/index.js";
import { polygonMumbai } from "viem/chains";
import { REQUEST_VALIDATOR_ADDRESS } from "../constants.js";
import {
  encodeFunctionData,
  type Address,
  type Hex,
  type Transaction,
  type TransactionReceipt,
} from "viem";
import { RequestValidatorAbi } from "../abis/RequestValidatorAbi.js";

export class RequestProvider extends ValidatorProvider<
  RequestValidator,
  RequestValidatorParams
> {
  constructor(params: ExtendedValidatorProviderParams<RequestValidatorParams>) {
    const chain =
      typeof params.opts?.providerConfig?.chain === "number"
        ? getChain(params.opts.providerConfig.chain)
        : params.opts?.providerConfig?.chain ?? polygonMumbai;
    const validator = new RequestValidator({
      projectId: params.projectId,
      owner: params.owner,
      chain,
      validatorAddress: REQUEST_VALIDATOR_ADDRESS,
      ...params.opts?.validatorConfig,
    });
    super(
      {
        ...params,
        opts: {
          ...params.opts,
          providerConfig: { ...params.opts?.providerConfig, chain },
        },
      },
      validator
    );
  }

  public static async init(
    params: ExtendedValidatorProviderParams<RequestValidatorParams>
  ): Promise<RequestProvider> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new RequestProvider({
      ...params,
      opts: {
        ...params.opts,
        providerConfig: {
          chain,
          ...params.opts?.providerConfig,
        },
      },
    });
    return instance;
  }

  encodeSetRequestSessions(
    validUntil: number,
    validAfter: number,
    amount: number,
    receiver: Address,
    token: Address
  ) {
    return encodeFunctionData({
      abi: RequestValidatorAbi,
      functionName: "setRequestSessions",
      args: [true, validUntil, validAfter, amount, receiver, token],
    });
  }

  async setRequestSession(
    validUntil: number,
    validAfter: number,
    amount: number,
    receiver: Address,
    token: Address
  ): Promise<SendUserOperationResult> {
    return await this.defaultProvider.sendUserOperation({
      target: this.getValidator().validatorAddress,
      data: this.encodeSetRequestSessions(
        validUntil,
        validAfter,
        amount,
        receiver,
        token
      ),
    });
  }
}
