const { runCommand } = require("../../orchestration/commandRunner");
const networkOrchestrator = require("../../orchestration/networkOrchestrator");

class networkProvisioningService {
  async testEcho({ user_id }) {
    // later this will be provision(), but for now just a safe test

    const message = `provision test for user=${user_id || "unknown"}`;
    const result = await runCommand({
      command: "echo",
      args: [`hello from backend user ${user_id}`],
      cwd: process.cwd(),
    });

    return {
      message,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  async provisionNetwork({ user_id, config }) {
    const {
      config: finalConfig,
      endpoints,
      workspace,
      network_id,
    } = await networkOrchestrator.provision(user_id, config);

    return {
      network_id,
      workspace,
      endpoints,
      config: finalConfig,
    };
  }
}

module.exports = new networkProvisioningService();
