import createSerialize from "./serializer";
import createDeserialize from "./deserializer";

export const ORIENT_CLASSNAME = "OJSON";

export function create (classes) {
  return {
    className: ORIENT_CLASSNAME,
    serialize: createSerialize(classes),
    deserialize: createDeserialize(classes)
  };
}