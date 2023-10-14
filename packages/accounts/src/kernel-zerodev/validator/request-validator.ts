import {
  getChain,
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  type SignTypedDataParams,
} from "@alchemy/aa-core";
import { KernelBaseValidator, type KernelBaseValidatorParams } from "./base.js";
import { encodeFunctionData, toBytes } from "viem";
import { RequestValidatorAbi } from "../abis/RequestValidatorAbi.js";
import { getChainId } from "../api/index.js";
import { DUMMY_ECDSA_SIG } from "../constants.js";
import { KernelAccountAbi } from "../abis/KernelAccountAbi.js";
import { fixSignedData } from "../utils.js";

export interface RequestValidatorParams extends KernelBaseValidatorParams {
  owner: SmartAccountSigner;
}

export class RequestValidator extends KernelBaseValidator {
  protected owner: SmartAccountSigner;

  constructor(params: RequestValidatorParams) {
    super(params);
    this.owner = params.owner;
  }

  public static async init(
    params: RequestValidatorParams
  ): Promise<RequestValidator> {
    const chainId = await getChainId(params.projectId);
    if (!chainId) {
      throw new Error("ChainId not found");
    }
    const chain = getChain(chainId);
    const instance = new RequestValidator({ ...params, chain });
    return instance;
  }

  async signer(): Promise<SmartAccountSigner> {
    return await Promise.resolve(this.owner);
  }

  async getOwner(): Promise<Hex> {
    return this.owner.getAddress();
  }

  async getEnableData(): Promise<Hex> {
    return this.getOwner();
  }

  encodeEnable(): Hex {
    return encodeFunctionData({
      abi: RequestValidatorAbi,
      functionName: "enable",
      args: ["0x"],
    });
  }

  encodeDisable(disableData: Hex = "0x"): Hex {
    return encodeFunctionData({
      abi: RequestValidatorAbi,
      functionName: "disable",
      args: [disableData],
    });
  }

  async getDummyUserOpSignature(): Promise<Hex> {
    return DUMMY_ECDSA_SIG;
  }

  async isPluginEnabled(
    kernelAccountAddress: Address,
    selector: Hex
  ): Promise<boolean> {
    if (!this.publicClient) {
      throw new Error("Validator uninitialized: PublicClient missing");
    }
    const execDetail = await this.publicClient.readContract({
      abi: KernelAccountAbi,
      address: kernelAccountAddress,
      functionName: "getExecution",
      args: [selector],
    });

    return (
      execDetail.validator.toLowerCase() === this.validatorAddress.toLowerCase()
    );
  }

  async signMessage(message: string | Uint8Array): Promise<Hex> {
    return await this.owner.signMessage(message);
  }

  async signTypedData(params: SignTypedDataParams): Promise<Hex> {
    return fixSignedData(await this.owner.signTypedData(params));
  }

  async signUserOp(userOp: UserOperationRequest): Promise<Hex> {
    if (!this.chain) {
      throw new Error("Validator uninitialized");
    }
    const hash = getUserOperationHash(
      {
        ...userOp,
        signature: "0x",
      },
      this.entryPointAddress,
      BigInt(this.chain.id)
    );
    const formattedMessage = typeof hash === "string" ? toBytes(hash) : hash;
    return encodeFunctionData({
      abi: RequestValidatorAbi,
      functionName: "setRequestSessions",
      args: [
        true,
        0,
        0,
        1000,
        "0x99A0950FF93C026Cfa1955AdEbDc9677C67FEE01",
        "0xf699d5f8F3C0E6Ad4e239685e7B5F141CF1a0CC1",
      ],
    });
  }
}
