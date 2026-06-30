insert into public.rag_documents (source, title, language, audience, tags, metadata)
values
  (
    'fitfit-core',
    'หลักการเริ่มออกกำลังกายสำหรับมือใหม่',
    'th',
    'beginner',
    array['workout', 'beginner', 'safety'],
    '{"version":"mvp"}'::jsonb
  ),
  (
    'fitfit-core',
    'หลักการกินให้ตรงเป้าด้วยงบจำกัด',
    'th',
    'general',
    array['nutrition', 'budget', 'thai-food'],
    '{"version":"mvp"}'::jsonb
  ),
  (
    'fitfit-core',
    'ข้อควรระวังเมื่อมีอาการเจ็บ',
    'th',
    'general',
    array['injury', 'safety'],
    '{"version":"mvp"}'::jsonb
  )
on conflict (source, title) do nothing;

insert into public.rag_chunks (document_id, chunk_index, content, token_count, metadata)
select d.id, 0, v.content, v.token_count, v.metadata
from public.rag_documents d
join (
  values
    (
      'หลักการเริ่มออกกำลังกายสำหรับมือใหม่',
      'ผู้เริ่มต้นควรเริ่มจากท่าพื้นฐานที่ควบคุมได้ เช่น สควอต วิดพื้นแบบปรับระดับ แพลงก์ และกลูตบริดจ์ ใช้ความหนักที่ยังคุมฟอร์มได้ พักระหว่างเซ็ต 60-90 วินาที และเพิ่มจำนวนครั้งหรือจำนวนเซ็ตทีละน้อยเมื่อทำได้สบาย',
      64,
      '{"topic":"beginner_workout"}'::jsonb
    ),
    (
      'หลักการกินให้ตรงเป้าด้วยงบจำกัด',
      'มื้ออาหารควรมีโปรตีนหนึ่งฝ่ามือ ผักหนึ่งถึงสองกำมือ และคาร์บตามระดับการซ้อม ถ้างบจำกัดให้เลือกไข่ อกไก่ ทูน่า เต้าหู้ ปลา และเมนูไทยที่ลดของทอดหรือน้ำหวานก่อน',
      70,
      '{"topic":"budget_nutrition"}'::jsonb
    ),
    (
      'ข้อควรระวังเมื่อมีอาการเจ็บ',
      'ถ้ามีอาการเจ็บแปลบ ชา บวม หรือเจ็บต่อเนื่อง ควรหยุดท่าที่กระตุ้นอาการและปรึกษาแพทย์หรือนักกายภาพก่อนซ้อมหนัก ผู้ช่วยฟิตเนสให้คำแนะนำทั่วไปได้ แต่ไม่ควรวินิจฉัยโรคหรือแทนการรักษา',
      72,
      '{"topic":"injury_safety"}'::jsonb
    )
) as v(title, content, token_count, metadata)
  on d.title = v.title
on conflict (document_id, chunk_index) do nothing;
