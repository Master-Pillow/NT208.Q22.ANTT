# Mock DAA Dataset Format

- students[].profile: mssv, full_name, dob, class_code
- students[].transcripts[]:
  - semester: string (vd: 2025-1)
  - items[]:
    - course: code, name, credits
    - status: HOC_MOI | HOC_LAI | CAI_THIEN
    - components: object (qt/gk/th/ck...)
    - final_score: number
    - letter: string