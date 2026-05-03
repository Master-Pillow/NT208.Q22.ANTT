import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'uit_advisorhub_secret_2026';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Kiểm tra xem header có chứa Bearer token không
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token xác thực. Vui lòng đăng nhập.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Giải mã token
    const decoded = jwt.verify(token, JWT_SECRET);
    // Gắn thông tin user vào request để các route sau có thể sử dụng
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};