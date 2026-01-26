# 詳細設計（v1.0）
GAS × スプレッドシート Web予約システム（自動車整備工場向け）

---

## 0. 本書の位置づけ

本書は以下ドキュメントを前提とした **詳細設計書** である。

- 01_requirements.md（要件定義 v1.1）
- 02_specification.md（仕様検討 v0.1）

本書では以下を定義する。

- スプレッドシート構成（DB設計相当）
- GAS構成・関数設計
- 画面単位の処理責務

---

## 1. 全体アーキテクチャ
```text
[Web予約フォーム]
        |
        v
[GAS Web Apps] ----+
        |
[管理者UI（電話予約）]
        |
        v
[共通予約登録ロジック]
        |
  +-----+-----------+
  |                 |
[予約台帳 Spreadsheet]   [Googleカレンダー]
        |
        v
[管理者通知メール]
```


- 正のデータ：予約台帳（Spreadsheet）
- Web予約／電話予約は共通ロジックを使用
- カレンダー・メールは派生データ

---

## 2. スプレッドシート設計

### 2.1 シート一覧

| シート名 | 役割 |
|---|---|
| reservations | 予約台帳（主テーブル） |
| slot_templates | 予約枠テンプレート |
| slot_overrides | 予約枠上書き（例外） |
| menus | メニュー定義 |
| settings | システム設定 |
| logs（任意） | エラーログ |

---

### 2.2 reservations（予約台帳）

| 列名 | 型 | 必須 | 説明 |
|---|---|---|---|
| reservation_id | string | ○ | UUID |
| reservation_type | string | ○ | WEB / PHONE |
| status | string | ○ | CONFIRMED / CANCELED / ERROR |
| menu_code | string | ○ | SHAKEN / TENKEN |
| start_at | datetime | ○ | 予約開始日時 |
| end_at | datetime | ○ | 予約終了日時 |
| name | string | ○ | 氏名 |
| tel | string | ○ | 電話番号 |
| email | string | | メール |
| note | string | | 備考 |
| calendar_event_id | string | | カレンダーイベントID |
| mail_sent | boolean | ○ | 通知送信済み |
| created_at | datetime | ○ | 作成日時 |
| updated_at | datetime | ○ | 更新日時 |
| error_code | string | | エラー識別子 |
| error_message | string | | エラー内容 |

---

### 2.3 slot_templates（予約枠テンプレ）

| 列名 | 型 | 必須 | 説明 |
|---|---|---|---|
| weekday | int | ○ | 0=日〜6=土 |
| time | string | ○ | HH:mm |
| capacity | int | ○ | 枠数 |

---

### 2.4 slot_overrides（予約枠上書き）

| 列名 | 型 | 必須 | 説明 |
|---|---|---|---|
| date | date | ○ | YYYY-MM-DD |
| time | string | ○ | HH:mm |
| capacity | int | ○ | 上書き枠数 |

---

### 2.5 menus（メニュー定義）

| 列名 | 型 | 必須 | 説明 |
|---|---|---|---|
| menu_code | string | ○ | SHAKEN / TENKEN |
| menu_label | string | ○ | 表示名 |
| duration_minutes | int | ○ | 所要時間 |
| calendar_title_prefix | string | ○ | 【車検】など |

---

### 2.6 settings（設定）

| 列名 | 型 | 必須 | 説明 |
|---|---|---|---|
| key | string | ○ | 設定キー |
| value | string | ○ | 設定値 |

例：
- calendar_id  
- notify_mail_to  
- timezone  

---

## 3. GAS構成設計

### 3.1 ファイル構成（推奨）
```text
src/
├─ main.gs
├─ reservationService.gs
├─ availabilityService.gs
├─ sheetRepository.gs
├─ calendarRepository.gs
├─ mailService.gs
├─ lockService.gs
├─ validator.gs
├─ errorHandler.gs
└─ ui/
   ├─ web_form.html
   └─ phone_form.html
```


---

## 4. 主要関数設計

### 4.1 createReservation(input)

**責務**  
Web予約／電話予約共通の予約登録処理。

**処理フロー**
1. 排他ロック取得
2. 空き枠判定
3. reservations に CONFIRMED 登録
4. Googleカレンダーイベント作成
5. calendar_event_id 更新
6. 管理者通知メール送信
7. ロック解放

---

### 4.2 checkAvailability(start_at)

- slot_overrides → slot_templates の順で capacity を決定
- reservations から CONFIRMED 件数を取得
- `count < capacity` の場合のみ true

---

### 4.3 cancelReservation(reservation_id)

- status を CANCELED に更新
- カレンダーイベント削除
- 失敗時は ERROR 記録

---

## 5. Web予約画面設計

### 入力項目
- メニュー
- 日時
- 氏名
- 電話番号
- メール（任意）
- 備考

### 処理
- submit → doPost → createReservation()

---

## 6. 電話予約登録画面（管理者）

### 特徴
- Web予約と同等の入力項目
- reservation_type = PHONE 固定
- 管理者のみ利用

---

## 7. エラー設計

### 7.1 想定エラー
- カレンダー作成失敗
- メール送信失敗

### 7.2 復旧方針
- ERROR 行を管理者が確認
- 再処理または CANCELED で整理

---

## 8. 非機能設計

- 排他制御：LockService
- タイムゾーン：Asia/Tokyo
- 個人情報は必要最小限のみ表示

---

## 9. 実装優先順位

1. スプレッドシート作成
2. 空き枠判定ロジック
3. createReservation()
4. Web予約フォーム
5. 電話予約登録
6. 管理者キャンセル処理

---

## 10. 次工程

- GAS実装
- 簡易テスト
- README作成
