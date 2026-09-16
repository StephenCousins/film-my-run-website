-- "Ask Stephen" chat: one thread per app install, keyed by install_id (no
-- accounts). See docs/superpowers/specs/2026-09-16-pro-page-chat-design.md §3.
CREATE TYPE "ChatSender" AS ENUM ('user', 'stephen');
CREATE TABLE "chat_threads" (
  "id" TEXT NOT NULL, "install_id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_user_message_at" TIMESTAMP(3), "last_reply_at" TIMESTAMP(3), "unanswered" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "chat_threads_install_id_key" ON "chat_threads"("install_id");
CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL, "thread_id" TEXT NOT NULL, "sender" "ChatSender" NOT NULL, "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "read_by_user_at" TIMESTAMP(3),
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"));
CREATE INDEX "chat_messages_thread_id_created_at_idx" ON "chat_messages"("thread_id", "created_at");
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
