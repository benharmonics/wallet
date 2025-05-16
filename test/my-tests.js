var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
describe("Lock", () => {
  it("Should set the right unlockTime", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const lockedAmount = 1000000000;
      const oneYearInSecs = 365 * 24 * 60 * 60;
      const unlocktime = (yield time.latest()) + oneYearInSecs;
    }));
});
