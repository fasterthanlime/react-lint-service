import * as ts_module from "typescript/lib/tsserverlibrary";
import {makeLinter} from "react-lint";

function init(modules: {typescript: typeof ts_module}) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    const oldLS = info.languageService;

    // Set up decorator
    const proxy: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(oldLS) as Array<keyof ts.LanguageService>) {
      const x = oldLS[k];
      proxy[k] = (...args: Array<{}>) => x.apply(oldLS, args);
    }

    proxy.getSemanticDiagnostics = (fileName: string) => {
      const prior = oldLS.getSemanticDiagnostics(fileName);

      if (prior.length > 0) {
        return prior;
      }

      try {
        let diagnostics: ts.Diagnostic[] = [];
        function reportDiagnostic(diag: ts.Diagnostic) {
          diagnostics.push(diag);
        }
        const program = oldLS.getProgram();
        const lint = makeLinter(program, reportDiagnostic);
        const sourceFile = program.getSourceFile(fileName);
        lint(sourceFile);
        return diagnostics;
      } catch (e) {
        info.project.projectService.logger.info(`react-lint-service error: ${e.toString()}`);
        info.project.projectService.logger.info(`Stack trace: ${e.stack}`);
      }
      return prior;
    }
  }

  return {create};
}

export = init;