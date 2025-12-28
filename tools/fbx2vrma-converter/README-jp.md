# FBX to VRMA コンバーター

FBXアニメーションファイルをVRMA（VRMアニメーション）形式に変換し、Webアプリケーションでのみウムアニメーションで使用できるようにします。

[English README](README.md) | 日本語 README

## 🎯 機能

- **🎬 FBX to VRMA変換**: FBXアニメーションをVRMA形式に変換
- **🎭 Mixamoサポート**: Mixamoアニメーションの自動ボーンマッピング
- **🔧 埋め込みバッファ**: 外部依存関係不要
- **✅ VRM互換**: @pixiv/three-vrm-animationとの完全互換性
- **🧪 検証ツール**: 内蔵の検証とテスト機能

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- macOS、Windows、またはLinux
- FBX2glTFバイナリ（以下のインストール手順を参照）

### インストール

#### 1. リポジトリのクローン

```bash
git clone https://github.com/tk256ailab/fbx2vrma-converter.git
cd fbx2vrma-converter
npm install
./setup.sh  # FBX2glTFバイナリをダウンロード
```

#### 2. FBX2glTFバイナリのダウンロード

**方法1: 自動セットアップ（推奨）**

セットアップスクリプトを実行して、お使いのプラットフォーム用の正しいバイナリを自動ダウンロード：

```bash
# macOS/Linux
./setup.sh

# Windows（コマンドプロンプト）
setup.bat

# Windows（PowerShell）
.\setup.bat
```

**方法2: 手動ダウンロード**

セットアップスクリプトが失敗した場合は、手動でバイナリをダウンロード：

1. [FBX2glTF Releases](https://github.com/facebookincubator/FBX2glTF/releases)にアクセス
2. 最新リリース（v0.9.7）をクリック
3. 適切なバイナリをダウンロード：
   - macOS: `FBX2glTF-darwin-x64`
   - Windows: `FBX2glTF-windows-x64.exe`
   - Linux: `FBX2glTF-linux-x64`
4. プロジェクトディレクトリにバイナリを配置
5. 実行権限を付与（macOS/Linux）: `chmod +x FBX2glTF-darwin-x64`

#### 3. インストールの確認

```bash
# バイナリが動作することをテスト
./FBX2glTF-darwin-x64 --help   # macOS
./FBX2glTF-windows-x64.exe --help   # Windows
./FBX2glTF-linux-x64 --help    # Linux
```

### 基本的な使用方法

```bash
# FBXファイルをVRMAに変換
node fbx2vrma-converter.js -i input.fbx -o output.vrma

# カスタムフレームレートで変換
node fbx2vrma-converter.js -i input.fbx -o output.vrma --framerate 60
```

### 例

```bash
# Mixamoアニメーションを変換
node fbx2vrma-converter.js -i examples/SittingLaughing.fbx -o SittingLaughing.vrma
```

## 📋 コマンドラインオプション

```
オプション:
  -i, --input <path>      入力FBXファイルパス（必須）
  -o, --output <path>     出力VRMAファイルパス（必須）
  --fbx2gltf <path>       FBX2glTFバイナリのパス（デフォルト: ./FBX2glTF-darwin-x64）
  --framerate <fps>       アニメーションフレームレート（デフォルト: 30）
  -h, --help              ヘルプ情報を表示
  -V, --version           バージョン番号を表示
```

**注意**: お使いのプラットフォームに適したFBX2glTFバイナリパスを指定してください：
- macOS: `--fbx2gltf ./FBX2glTF-darwin-x64`
- Windows: `--fbx2gltf ./FBX2glTF-windows-x64.exe`
- Linux: `--fbx2gltf ./FBX2glTF-linux-x64`

## 🎭 動作原理

1. **FBX変換**: FBX2glTFを使用してFBXをglTF形式に変換
2. **アニメーション強化**: アニメーションタイミングデータを分析・改善
3. **バッファ埋め込み**: バイナリデータを埋め込んで自己完結型ファイルを作成
4. **VRMA生成**: 適切なVRM拡張を持つVRMA形式に変換
5. **ボーンマッピング**: MixamoボーンをVRMヒューマノイド仕様にマッピング

## 🔧 技術詳細

### サポートされるボーンマッピング

コンバーターは自動的にMixamoボーン名をVRMヒューマノイドボーンにマッピングします：

- `mixamorig:Hips` → `hips`
- `mixamorig:Spine` → `spine`
- `mixamorig:Spine1` → `chest`
- `mixamorig:Spine2` → `upperChest`
- `mixamorig:Neck` → `neck`
- `mixamorig:Head` → `head`
- その他多数...

### VRMA形式

生成されるVRMAファイルには以下が含まれます：
- VRMC_vrm_animation拡張 v1.0
- 埋め込みバイナリバッファ
- 適切なアニメーションタイミングメタデータ
- ヒューマノイドボーンマッピング

## 🧪 テスト

変換されたVRMAファイルは以下と互換性があります：
- [@pixiv/three-vrm-animation](https://github.com/pixiv/three-vrm) v3.4.1+
- Three.js r177+
- モダンWebブラウザ

## 📁 プロジェクト構造

```
fbx2vrma/
├── fbx2vrma-converter.js    # メインコンバータースクリプト
├── README.md                # 英語ドキュメント
├── README-jp.md            # このファイル
├── package.json            # Node.js依存関係
├── LICENSE                 # MITライセンス
└── .gitignore             # Git無視ルール
```

## 🤝 コントリビューション

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを開く

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [FBX2glTF](https://github.com/facebookincubator/FBX2glTF) - FBXからglTFへの変換
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) - Three.js用VRMサポート
- [Mixamo](https://www.mixamo.com/) - アニメーションソース

## 📞 サポート

問題が発生した場合や質問がある場合：

1. [Issues](https://github.com/yourusername/fbx2vrma-converter/issues)ページを確認
2. 詳細情報を含む新しいイシューを作成
3. 可能であればサンプルファイルを含める

---

**主にClaude Codeで作成されました**
