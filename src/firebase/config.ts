import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Firebase 설정
// 이 정보는 민감하지 않고 클라이언트에 노출되어도 안전합니다
const firebaseConfig = {
  apiKey: "AIzaSyB3wQQGsRz2nkN6K3TQVoVI0GEwvJZNrLA",
  authDomain: "rothem-acd02.firebaseapp.com",
  projectId: "rothem-acd02",
  storageBucket: "rothem-acd02.firebasestorage.app",
  messagingSenderId: "141311538298",
  appId: "1:141311538298:web:24ed26bea75c46c4b6b7c3",
  measurementId: "G-9E9QEMZLBV",
}

// Firebase 초기화
export const app = initializeApp(firebaseConfig)

// Firebase 인증 인스턴스 가져오기
export const auth = getAuth(app) 