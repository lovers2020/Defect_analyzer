# DefectAnalyzer

Excel / CSV 공정 부적합 데이터를 검색하고 불량 수량과 조치 완료율을 분석하는 대시보드입니다.

## 실행

Node.js 환경에서 다음 명령을 실행합니다.

```sh
npm install
npm run dev
```

## 검증 및 배포

```sh
npm run lint
npm run build
```

Vercel에서 `npm run build`로 빌드하고 `dist`를 배포합니다.

## 사용

- 파일 업로드 또는 샘플 파일로 시작합니다. 첫 번째 시트의 7번째 행을 헤더로 읽습니다.
- 제품군·모델명·부적합 증상·발생원인으로 검색합니다.
- 원본 데이터 탭에서 검색하고 열 너비를 조정할 수 있습니다.
- 결과 내보내기는 현재 검색된 데이터를 Excel 파일로 저장합니다.
- 조치 완료율은 첫 번째 조치 완료 날짜가 있는 행의 불량 수량을 기준으로 계산하며, 기존 조치수량 열도 지원합니다.

Pretendard 폰트와 SIL Open Font License는 `public/fonts/pretendard`에 포함되어 있습니다.
