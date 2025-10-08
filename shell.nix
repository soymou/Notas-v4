{ pkgs ? import <nixpkgs> { config = {}; overlays = []; } } :

pkgs.mkShellNoCC {
  packages = with pkgs; [
    python3
    lean4
    rustc
    nodejs
    typst
  ];
  
  shellHook = ''
    echo "Listo para publicar!"
  '';
}
