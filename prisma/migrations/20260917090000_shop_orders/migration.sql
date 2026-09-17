ALTER TABLE "orders" ADD COLUMN "email" TEXT;
ALTER TABLE "orders" ADD COLUMN "printify_order_id" TEXT;
CREATE INDEX "orders_stripe_session_id_idx" ON "orders"("stripe_session_id");
CREATE INDEX "orders_printify_order_id_idx" ON "orders"("printify_order_id");
