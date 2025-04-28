import { GoogleAuth } from './GoogleAuth'

interface SettingsPageProps {
  onLoginComplete?: () => void;
}

export const SettingsPage = ({ onLoginComplete }: SettingsPageProps) => {
  return (
    <div className="container p-4 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="mb-4 text-xl font-semibold">데이터 소스</h2>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="mb-4 text-gray-700">
              이 앱은 기본적으로 로컬 JSON 파일을 데이터 소스로 사용합니다.
              Google 스프레드시트를 데이터 소스로 사용하려면 아래에서 연동하세요.
            </p>
            <GoogleAuth onLoginComplete={onLoginComplete} />
          </div>
        </section>
      </div>
    </div>
  )
} 