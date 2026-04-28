import { PromptTemplate } from './types';

export const SYSTEM_PROMPTS: PromptTemplate[] = [
  {
    id: 'speech-recognition',
    icon: 'Mic',
    title: 'Nhận diện lời nói',
    description: 'Chuyển toàn bộ lời nói trong video hoặc audio thành phụ đề chính xác theo thời gian.',
    content: `You are an expert transcriber. Your task is to transcribe EVERY possible spoken content in this {contentType}. 

CRITICAL INSTRUCTIONS:
1. Break the transcription into VERY SHORT segments. Focus on natural pauses, breath breaks, and short phrases. 
2. Aim for segments that are typically only a few words long. Do NOT create long segments covering multiple sentences.
3. Return the results in a JSON array format.
4. Timestamps MUST be absolute seconds from the start of the video (e.g., 2m10s is 130.0).
5. Ensure you process the video MIỆT MÀI cho đến giây cuối cùng, không được tóm tắt hay bỏ lửng giữa chừng.

If there is no speech, return an empty array [].`,
    isSystem: true
  },
  {
    id: 'game-recognition',
    icon: 'Gamepad2',
    title: 'Nhận diện lời nói về Game',
    description: 'Nhận diện lời nói trong game với thuật ngữ chuyên môn, tên kỹ năng và lời nói nhanh.',
    content: `You are an expert game content analyzer. Your task is to transcribe speech, skill names, and gaming terminology in this {contentType}.

CRITICAL INSTRUCTIONS:
1. Focus on game-specific jargon, character names, and fast-paced commentary.
2. Break transcription into VERY SHORT segments based on combat rhythm and natural pauses.
3. Return the results in a JSON array format.
4. Timestamps MUST be absolute seconds.
5. Do NOT skip any part of the video. Process until the very end.`,
    isSystem: true
  },
  {
    id: 'hardsub-extraction',
    icon: 'FileText',
    title: 'Trích xuất phụ đề (HardSub)',
    description: 'Trích xuất hardsub, văn bản có trên màn hình, bỏ qua âm thanh. Hiểu và chuyển thành phụ đề.',
    content: 'Trích xuất văn bản trên màn hình thành JSON phụ đề. startTime/endTime phải là SỐ GIÂY TUYỆT ĐỐI chính xác theo thời điểm xuất hiện trên video.',
    isSystem: true
  },
  {
    id: 'combined-subtitle',
    icon: 'Layers',
    title: 'Phụ đề kết hợp',
    description: 'Kết hợp lời nói và hardsub trên màn hình để tạo phụ đề đầy đủ, hạn chế thiếu nội dung.',
    content: 'Kết hợp lời nói và văn bản màn hình thành JSON. Sử dụng SỐ GIÂY TUYỆT ĐỐI cho startTime/endTime. Đảm bảo không bỏ sót nội dung từ đầu đến cuối video.',
    isSystem: true
  },
  {
    id: 'lyrics-extraction',
    icon: 'Music',
    title: 'Trích xuất lời bài hát',
    description: 'Chỉ nhận diện lời bài hát, bỏ qua lời nói và âm thanh khác.',
    content: 'Trích xuất lời bài hát thành JSON. Dùng SỐ GIÂY TUYỆT ĐỐI cho timestamps. Phải chính xác với nhịp điệu bài hát.',
    isSystem: true
  },
  {
    id: 'video-description',
    icon: 'Video',
    title: 'Mô tả video',
    description: 'Tự động mô tả những gì đang diễn ra trong video: hành động, cảnh vật và sự kiện chính.',
    content: 'Mô tả hành động video dưới dạng JSON phụ đề. Dùng SỐ GIÂY TUYỆT ĐỐI. Đảm bảo các mô tả trải dài theo toàn bộ thời lượng video.',
    isSystem: true
  },
  {
    id: 'chaptering',
    icon: 'BookOpen',
    title: 'Phân chương',
    description: 'Phân chia video thành các chương dựa trên chủ đề và thay đổi nội dung.',
    content: 'Phân chương video thành JSON. Dùng SỐ GIÂY TUYỆT ĐỐI cho điểm bắt đầu/kết thúc chương.',
    isSystem: true
  },
  {
    id: 'speaker-recognition',
    icon: 'Users',
    title: 'Nhận diện người nói',
    description: 'Nhận diện ai đang nói và gắn tên người nói cho từng đoạn phụ đề.',
    content: 'Nhận diện người nói trong {contentType} và tạo JSON. Dùng SỐ GIÂY TUYỆT ĐỐI. Gắn tên người nói vào nội dung.',
    isSystem: true
  },
  {
    id: 'direct-translation',
    icon: 'Globe',
    title: 'Dịch trực tiếp',
    description: 'Phiên âm và dịch trực tiếp sang ngôn ngữ đích trong một bước.',
    content: 'Phiên âm và dịch {contentType} sang tiếng Việt trực tiếp trong JSON. Dùng SỐ GIÂY TUYỆT ĐỐI, phủ hết thời lượng video.',
    isSystem: true
  }
];

export const AI_MODELS = [
  { 
    id: 'gemini-2.5-pro', 
    label: 'Gemini 2.5 Pro', 
    tag: 'PREMIUM', 
    color: 'amber',
    description: 'Chính xác và mạnh mẽ nhất, tốt nhất cho phân tích phức tạp',
    speed: 'Chậm',
    accuracy: 'Cao Nhất'
  },
  { 
    id: 'gemini-2.5-flash', 
    label: 'Gemini 2.5 Flash', 
    tag: 'BEST', 
    color: 'emerald',
    description: 'Cân bằng tốt nhất giữa tốc độ và độ chính xác',
    speed: 'Nhanh',
    accuracy: 'Cao'
  },
  { 
    id: 'gemini-2.5-flash-lite', 
    label: 'Gemini 2.5 Flash Lite', 
    tag: 'FASTEST', 
    color: 'blue',
    description: 'Xử lý nhanh nhất, tốt cho phân tích nhanh',
    speed: 'Nhanh Nhất',
    accuracy: 'Tốt'
  },
  { 
    id: 'gemini-2.0-flash', 
    label: 'Gemini 2.0 Flash', 
    tag: 'STABLE', 
    color: 'indigo',
    description: 'Đáng tin cậy và đã được kiểm tra kỹ',
    speed: 'Bình Thường',
    accuracy: 'Tốt'
  },
];
