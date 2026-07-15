import { ensureServiceOrderSchema } from "../lib/service-orders";

ensureServiceOrderSchema()
  .then(() => {
    console.log("ILLCO service-order schema is ready.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
