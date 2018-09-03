import * as ts_module from "typescript/lib/tsserverlibrary";
import { initReactLint } from "react-lint";

function init(modules: { typescript: typeof ts_module }) {
  const ts = modules.typescript;
  function create(info: ts.server.PluginCreateInfo) {
    const reactLint = initReactLint({typescript: ts});
    info.project.projectService.logger.info(
      `react-lint-service is starting up!`
    );

    const oldLS = info.languageService;

    // Set up decorator
    const proxy: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(oldLS) as Array<keyof ts.LanguageService>) {
      const x = oldLS[k];
      proxy[k] = (...args: Array<{}>) => x.apply(oldLS, args);
    }

    proxy.getSemanticDiagnostics = (fileName: string) => {
      info.project.projectService.logger.info(
        `react-lint-service was asked for diagnostics for ${fileName}`
      );
      const prior = oldLS.getSemanticDiagnostics(fileName);

      if (prior.length > 0) {
        info.project.projectService.logger.info(
          `react-lint-service is returning prior`
        );
        return prior;
      }

      try {
        let diagnostics: ts.Diagnostic[] = prior ? [...prior] : [];
        function reportDiagnostic(diag: ts.Diagnostic) {
          diagnostics.push(diag);
        }
        function log(msg: string) {
          info.project.projectService.logger.info(`react-lint: ${msg}`);
        }
        const program = oldLS.getProgram();
        const lint = reactLint.makeLinter(program, reportDiagnostic, log);
        const sourceFile = program.getSourceFile(fileName);
        lint(sourceFile);
        return diagnostics;
      } catch (e) {
        info.project.projectService.logger.info(
          `react-lint-service error: ${e.toString()}`
        );
        info.project.projectService.logger.info(`Stack trace: ${e.stack}`);
      }
      return prior;
    };
    return proxy;
  }

  return { create };
}

export = init;
