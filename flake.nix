{
  description = "Notas development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05"; 
  };

  outputs = { self, nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; }; 
    in {
      devShells."${system}".default = pkgs.mkShell {
        packages = with pkgs; [
          node2nix
          nodejs
          nodePackages.npm
          lean4
        ];
      };
    };
}
