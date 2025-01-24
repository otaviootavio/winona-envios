import { CorreiosAuthRepository } from "~/app/api/repositories/CorreiosAuthRepository";
import { CorreiosRepository } from "~/app/api/repositories/CorreiosRepository";

interface TestCredentialsResult {
  success: boolean;
  error?: string;
  details: {
    basicAuth: boolean;
    contractAuth: boolean;
    trackingApi: boolean;
  };
}

interface CorreiosCredentialsInput {
  identifier: string;
  accessCode: string;
  contract?: {
    number: string;
    dr?: number;
  };
}

export async function testCorreiosCredentials(
  credentials: CorreiosCredentialsInput,
): Promise<TestCredentialsResult> {
  const authRepo = new CorreiosAuthRepository();
  const details = {
    basicAuth: false,
    contractAuth: false,
    trackingApi: false,
  };

  try {
    await authRepo.authenticate({
      identifier: credentials.identifier,
      accessCode: credentials.accessCode,
    });
    details.basicAuth = true;

    if (credentials.contract) {
      const contractAuthResponse = await authRepo.authenticateWithContract(
        {
          identifier: credentials.identifier,
          accessCode: credentials.accessCode,
        },
        {
          numero: credentials.contract.number,
          dr: credentials.contract.dr,
        },
      );
      details.contractAuth = true;

      const correiosRepo = new CorreiosRepository(contractAuthResponse.token);
      await correiosRepo.getObjectTracking("AA123456789BR", "U");
      details.trackingApi = true;
    }

    return {
      success: true,
      details,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    let errorMessage = "";

    if (message.includes("401")) {
      errorMessage =
        "Invalid credentials. Please check your CPF/CNPJ and access code.";
    } else if (message.includes("contract")) {
      errorMessage =
        "Invalid contract number. Please verify your contract information.";
    } else {
      errorMessage = "Failed to validate credentials. Please try again.";
    }

    return {
      success: false,
      error: errorMessage,
      details,
    };
  }
}
