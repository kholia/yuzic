import { readFileSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

// The navigator does not contain the root player or its song-option sheets.
// Check their real JSX ancestry without replacing the context hook with a mock.
function ancestry(file: string, target: string): string[][] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: string[][] = [];
  function visit(node: ts.Node, parents: string[]) {
    if (ts.isJsxElement(node)) {
      const name = node.openingElement.tagName.getText(source);
      if (name === target) matches.push(parents);
      node.children.forEach(child => visit(child, [...parents, name]));
      return;
    }
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === target) {
      matches.push(parents);
    }
    ts.forEachChild(node, child => visit(child, parents));
  }
  visit(source, []);
  return matches;
}

describe('app-wide external resolution scope', () => {
  const root = join(__dirname, '../../app/_layout.tsx');

  it.each(['PlayerHost', 'SongActionSheetProvider', 'Stack'])(
    'provides external resolution to %s', target => {
      const matches = ancestry(root, target);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toContain('ExternalResolutionProvider');
    },
  );

  it('places the source pickers inside the bottom-sheet host', () => {
    const matches = ancestry(root, 'ExternalResolutionProvider');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toContain('BottomSheetModalProvider');
  });

  it('shares the root resolver with browsing instead of shadowing it in home', () => {
    expect(ancestry(join(__dirname, '../../app/(home)/_layout.tsx'), 'ExternalResolutionProvider')).toHaveLength(0);
  });
});
