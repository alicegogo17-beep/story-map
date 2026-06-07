# Story Map Tool

장면 카드를 배치하고, 분기와 합류를 연결하고, 더블 클릭으로 상세 스토리를 편집할 수 있는 웹 도구입니다.

## 호환 환경

- macOS
- Windows
- 최신 Chrome / Edge / Safari 권장

기본 편집은 정적으로도 가능하고, `웹 저장`과 `공유 링크`는 Supabase를 연결하면 무료로 사용할 수 있습니다.

## 실행 방법

### macOS

- 같은 폴더의 `스토리맵-열기.command`를 더블 클릭
- 또는 `index.html`을 브라우저로 열기

### Windows

- 같은 폴더의 `스토리맵-열기.bat`를 더블 클릭
- 또는 `index.html`을 브라우저로 열기

## 다른 컴퓨터로 옮길 때

아래 파일들을 **같은 폴더 구조 그대로** 복사하면 됩니다.

- `index.html`
- `styles.css`
- `app.js`
- `sample-story.json`
- `스토리맵-열기.command`
- `스토리맵-열기.bat`

압축해서 전달할 때도 `story-map` 폴더 통째로 보내는 방식이 가장 안전합니다.

## 주요 기능

- 장면 카드 추가 / 삭제
- 분기 생성
- 합류 장면 생성
- 카드 드래그 이동
- 카드 우클릭 메뉴
- 중요 장면 별 표시
- 더블 클릭 상세 편집
- 맵 JSON 내보내기 / 불러오기
- 저장 연결 설정 / 웹 저장 / 공유 링크 복사
- 신리스트 / 시나리오 / Markdown 문서 내보내기

## 사용 방법

1. 상단에 제목과 로그라인을 입력합니다.
2. 빈 화면의 `+` 버튼으로 첫 장면을 만듭니다.
3. 카드를 한 번 클릭하면 기준 장면으로 선택됩니다.
4. 선택된 카드를 우클릭하면 `장면 추가`, `장면 삭제`, `중요`를 사용할 수 있습니다.
5. 카드를 빠르게 두 번 클릭하면 상세 편집 카드가 열립니다.
6. 카드 오른쪽 연결 탭을 드래그해서 다른 카드와 연결할 수 있습니다.
7. `저장 연결 설정` 버튼을 눌러 Supabase Project URL과 anon key를 입력합니다.
8. `웹 저장` 버튼으로 Supabase에 맵을 저장할 수 있습니다.
9. `공유 링크 복사` 버튼으로 현재 맵 링크를 복사할 수 있습니다.
10. `맵 다운로드` 버튼을 우클릭하면 맵 / 신리스트 / 시나리오 / md 문서를 저장할 수 있습니다.

## 공유 방식

- 공유 데이터는 Supabase의 `story_maps` 테이블에 저장됩니다.
- 링크는 `https://배포주소/?share=<ID>` 형태로 만들어집니다.
- 이 링크를 다른 사람이 열어도 같은 맵을 불러올 수 있습니다.

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor를 열고 [supabase-setup.sql](/Users/choeijin-uimaeg/Desktop/synopsis-to-scenario-main/story-map/supabase-setup.sql) 내용을 실행합니다.
3. Project URL과 anon public key를 확인합니다.
4. 앱에서 `저장 연결 설정` 버튼을 눌러 두 값을 입력합니다.

선택:

- 배포용으로는 [supabase-config.js](/Users/choeijin-uimaeg/Desktop/synopsis-to-scenario-main/story-map/supabase-config.js) 에 URL/anon key를 넣어도 됩니다.
- 또는 앱을 처음 열었을 때 `저장 연결 설정`으로 브라우저에만 저장해도 됩니다.

중요:

- `공유 링크를 받은 다른 사람`도 바로 열 수 있게 하려면, 배포 전에 `supabase-config.js`에 Supabase URL과 anon key를 넣어두는 편이 가장 쉽습니다.
- anon key는 공개용 키라서 프론트엔드에 들어가도 됩니다.

## 무료 배포

Render에서는 `Web Service`가 아니라 `Static Site`로 올리면 됩니다.

추천 흐름:

1. GitHub에 이 프로젝트를 올립니다.
2. [supabase-config.js](/Users/choeijin-uimaeg/Desktop/synopsis-to-scenario-main/story-map/supabase-config.js) 에 아래처럼 값을 넣고 GitHub에 다시 올립니다.

```js
window.STORY_MAP_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

3. Render에서 `New +` → `Static Site`
4. 저장소를 연결합니다.
5. 설정은 아래처럼 넣습니다.
   - Build Command: 비워두기
   - Publish Directory: `story-map`
6. 배포된 주소에서 앱을 엽니다.
7. 이제 `웹 저장`과 `공유 링크 복사`를 무료로 사용할 수 있습니다.

Render 참고:

- `Web Service`는 현재 방식에서는 불필요합니다.
- `Starter` 같은 유료 플랜도 필요 없습니다.
- `Static Site` + `Supabase` 조합이 무료 공유용 권장 방식입니다.

## JSON 형식

```json
{
  "title": "맵 제목",
  "logline": "짧은 설명",
  "nodes": [
    {
      "sceneId": "scene-1",
      "title": "씬의 정보",
      "summary": "박스 안의 짧은 요약",
      "detail": "상세 스토리",
      "important": false,
      "x": 100,
      "y": 300,
      "nextIds": ["scene-2"]
    }
  ]
}
```

## 배포 팁

- 문서 내보내기와 JSON 저장은 브라우저 기본 다운로드 기능을 사용합니다.
- 회사 PC나 공용 PC처럼 다운로드 제한이 있는 환경에서는 저장 위치 권한만 확인하면 됩니다.
- 아주 오래된 브라우저보다는 최신 브라우저 사용을 권장합니다.
