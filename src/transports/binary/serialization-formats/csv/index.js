import createSerialize from "./serializer";
import createDeserialize from "./deserializer";

export const ORIENT_CLASSNAME = "ORecordDocument2csv";

export function create (classes) {
  return {
    className: ORIENT_CLASSNAME,
    serialize: createSerialize(classes),
    deserialize: createDeserialize(classes)
  };
}