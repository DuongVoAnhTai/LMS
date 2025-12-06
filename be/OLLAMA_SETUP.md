# Hướng dẫn cài đặt và sử dụng Ollama

## Tổng quan

Hệ thống hỗ trợ 2 AI providers:
- **Ollama** (khuyến nghị): Chạy local, không rate limit, miễn phí
- **Gemini**: Cloud-based, có rate limit

## Cài đặt Ollama

### 1. Cài đặt Ollama

**Windows/Mac/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Hoặc tải về từ: https://ollama.com/download

### 2. Pull các models cần thiết

**Model cho Embedding (nomic-embed-text - 274MB):**
```bash
ollama pull nomic-embed-text
```

**Model cho Text Generation (Qwen3 - chọn 1):**
```bash
# Nhẹ nhất (2GB) - phù hợp máy yếu
ollama pull qwen3:4b

# Khuyến nghị (4.7GB) - cân bằng tốt
ollama pull qwen3:8b

# Tốt nhất (17GB) - cần RAM mạnh
ollama pull qwen3:30b
```

### 3. Kiểm tra xem Ollama đang chạy

```bash
ollama list
```

Bạn sẽ thấy danh sách các models đã pull.

## Cấu hình

### 1. Cập nhật file `.env`

```env
# Chọn provider (ollama hoặc gemini)
EMBEDDING_PROVIDER=ollama
GENERATION_PROVIDER=ollama

# Cấu hình Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_GENERATION_MODEL=qwen3:8b

# Gemini (optional - chỉ cần nếu muốn dùng Gemini làm fallback)
GEMINI_API_KEY=your-gemini-api-key
```

### 2. Các provider combinations

**Tất cả dùng Ollama (khuyến nghị):**
```env
EMBEDDING_PROVIDER=ollama
GENERATION_PROVIDER=ollama
```

**Mix: Ollama cho embedding, Gemini cho generation:**
```env
EMBEDDING_PROVIDER=ollama
GENERATION_PROVIDER=gemini
```

**Tất cả dùng Gemini:**
```env
EMBEDDING_PROVIDER=gemini
GENERATION_PROVIDER=gemini
GEMINI_API_KEY=your-api-key
```

## Sử dụng các models khác

### Models cho Embedding

```env
# Mặc định (khuyến nghị)
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Hoặc sử dụng model khác
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
```

### Models cho Generation

```env
# Qwen3 (khuyến nghị cho tiếng Việt)
OLLAMA_GENERATION_MODEL=qwen3:8b

# Llama 3.2
OLLAMA_GENERATION_MODEL=llama3.2

# Mistral
OLLAMA_GENERATION_MODEL=mistral

# Gemma
OLLAMA_GENERATION_MODEL=gemma2
```

## Fallback Logic

Hệ thống tự động fallback nếu Ollama không khả dụng:

1. **Kiểm tra Ollama** có đang chạy không
2. **Kiểm tra model** đã được pull chưa
3. **Nếu OK**: Dùng Ollama
4. **Nếu FAIL**: Tự động chuyển sang Gemini (nếu có API key)

## So sánh Ollama vs Gemini

| Tiêu chí | Ollama | Gemini |
|----------|--------|--------|
| **Chi phí** | Miễn phí | Có rate limit miễn phí |
| **Tốc độ** | Nhanh (nếu có GPU) | Phụ thuộc mạng |
| **Rate limit** | Không có | 15 req/phút |
| **Bảo mật** | Dữ liệu local | Gửi lên cloud |
| **Yêu cầu** | RAM 8GB+, GPU tùy chọn | Chỉ cần internet |
| **Chất lượng** | Tùy model | Rất cao |

## Troubleshooting

### Ollama không chạy

```bash
# Kiểm tra service
ollama serve

# Hoặc khởi động lại
sudo systemctl restart ollama
```

### Model chưa được pull

```bash
# Xem danh sách models có sẵn
ollama list

# Pull model
ollama pull nomic-embed-text
ollama pull qwen3:8b
```

### Port 11434 đã được sử dụng

Thay đổi port trong `.env`:
```env
OLLAMA_URL=http://localhost:11435
```

Và khởi động Ollama với port mới:
```bash
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

### Lỗi "out of memory"

Giảm kích thước model:
```bash
# Thay vì qwen3:30b, dùng qwen3:8b hoặc qwen3:4b
ollama pull qwen3:4b
```

## Test hệ thống

```bash
# Chạy test RAG
npm run socket:dev
# Trong terminal khác
tsx src/tests/testRAG.ts
```

Bạn sẽ thấy log:
```
✓ Using Ollama for embeddings
✓ Using Ollama (Qwen3) for text generation
```

## Monitoring

Xem API calls Ollama:
```bash
# Terminal 1: Chạy Ollama với verbose
OLLAMA_DEBUG=1 ollama serve

# Terminal 2: Chạy app
npm run socket:dev
```

## Khuyến nghị

**Cho development:**
- Dùng Ollama để tránh rate limit
- Model: `qwen3:8b` + `nomic-embed-text`

**Cho production:**
- Dùng Ollama nếu có server mạnh
- Hoặc dùng Gemini Pro với API key trả phí

**Cho máy yếu:**
- Dùng `qwen3:4b` thay vì `qwen3:8b`
- Hoặc fallback sang Gemini
