let upstream = https://github.com/dfinity/vessel-package-set/releases/download/mo-0.6.21-20220215/package-set.dhall sha256:b46f30e811fe5085741be01e126629c2a55d4c3d6ebf49408fb3b4a98e37589b
let Package =
    { name : Text, version : Text, repo : Text, dependencies : List Text }

let
  -- This is where you can add your own packages to the package-set
  -- Added from: https://github.com/aviate-labs/package-set/blob/main/package-set.dhall
  additions =
    [
        { name = "array"
        , repo = "https://github.com/aviate-labs/array.mo"
        , version = "v0.2.0"
        , dependencies = [ "base" ]
        },
        { name = "encoding"
        , repo = "https://github.com/aviate-labs/encoding.mo"
        , version = "v0.3.2"
        , dependencies = [ "array", "base" ]
        },
        { name = "json"
        , repo = "https://github.com/aviate-labs/json.mo"
        , version = "v0.1.1"
        , dependencies = [ "base", "parser-combinators" ]
        },
        { name = "parser-combinators"
        , repo = "https://github.com/aviate-labs/parser-combinators.mo"
        , version = "v0.1.0"
        , dependencies = [ "base" ]
        }
    ] : List Package

let
  {- This is where you can override existing packages in the package-set

     For example, if you wanted to use version `v2.0.0` of the foo library:
     let overrides = [
         { name = "foo"
         , version = "v2.0.0"
         , repo = "https://github.com/bar/foo"
         , dependencies = [] : List Text
         }
     ]
  -}
  overrides =
    [] : List Package

in  upstream # additions # overrides
