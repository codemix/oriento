// import {RID} from "../../../../data-types";

export default function create () {
  return function serialize (value) {
    return JSON.stringify(value);
  };
}