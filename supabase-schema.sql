-- Supabase SQL Editor에서 실행하세요

-- pgvector 확장
create extension if not exists vector;

-- 1. documents: RAG 청크 저장
create table if not exists documents (
  id         bigserial primary key,
  source     text not null,          -- 파일명
  chunk_idx  int  not null,          -- 청크 순번
  content    text not null,          -- 청크 텍스트
  embedding  vector(1536),           -- text-embedding-3-small
  created_at timestamptz default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- 2. leads: 상담 신청 저장
create table if not exists leads (
  id         bigserial primary key,
  name       text,
  email      text,
  phone      text,
  message    text,
  created_at timestamptz default now()
);

-- 3. chat_logs: 대화 기록
create table if not exists chat_logs (
  id         bigserial primary key,
  user_msg   text not null,
  bot_reply  text not null,
  created_at timestamptz default now()
);

-- 4. 유사도 검색 함수
create or replace function match_documents(
  query_embedding vector(1536),
  match_count     int default 5
)
returns table (
  id      bigint,
  source  text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    source,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
