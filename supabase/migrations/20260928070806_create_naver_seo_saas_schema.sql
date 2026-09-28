/*
# 네이버 쇼핑 SEO 분석 SaaS - 전체 데이터베이스 스키마

## 개요
네이버 쇼핑 판매자가 자신의 상품과 경쟁 상품을 분석하고 SEO, 상품 적합성, 가격, 리뷰, 배송, 경쟁력, 순위 변화를 장기적으로 기록하여 개선할 부분을 찾는 SaaS 앱의 데이터베이스 스키마입니다.
이 서비스는 자동 검색, 자동 클릭, 순위 조작 등을 수행하지 않으며, 사용자가 직접 입력하거나 합법적 데이터 소스를 통해 관찰한 데이터를 기록/분석합니다.

## 테이블 목록
1. products - 사용자가 등록한 상품
2. keywords - 상품별 추적 키워드
3. ranking_history - 키워드별 관찰 순위 기록 (시계열)
4. competitors - 키워드별 경쟁상품 데이터 (시계열 스냅샷)
5. seo_analysis - 상품별 SEO 자체진단 점수
6. product_changes - 상품 변경 이력
7. tasks - 오늘 해야 할 일 / 작업 관리
8. reports - 주간 리포트
9. keyword_opportunities - 키워드 기회 분석 데이터
10. settings - 사용자별 설정 (점수 가중치 등)

## 보안
- 모든 테이블에 RLS 활성화
- 인증된 사용자가 자신의 데이터만 접근 가능 (user_id 기반 ownership)
- user_id 컬럼은 DEFAULT auth.uid()로 설정하여 클라이언트 insert 시 자동 채움

## 중요 사항
1. 순위 데이터는 "관찰 순위"로 명명 - 공식 순위가 아님
2. SEO 점수는 "자체 진단 점수" - 네이버 공식 점수가 아님
3. 자동화된 데이터 수집 기능은 포함하지 않음 (사용자 직접 입력 또는 합법적 API)
*/

-- ============================================================
-- 1. products 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  naver_product_id text,
  product_name text NOT NULL,
  product_url text,
  primary_keyword text,
  category text,
  price integer,
  brand text,
  manufacturer text,
  review_count integer DEFAULT 0,
  rating numeric(3,1) DEFAULT 0,
  shipping text,
  image_url text,
  attributes jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'observe' CHECK (status IN ('good', 'observe', 'improve', 'critical')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_products" ON products;
CREATE POLICY "select_own_products" ON products FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_products" ON products;
CREATE POLICY "insert_own_products" ON products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- ============================================================
-- 2. keywords 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  search_volume integer DEFAULT 0,
  competition integer DEFAULT 0,
  ad_competition integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_keywords" ON keywords;
CREATE POLICY "select_own_keywords" ON keywords FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = keywords.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_keywords" ON keywords;
CREATE POLICY "insert_own_keywords" ON keywords FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = keywords.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_keywords" ON keywords;
CREATE POLICY "update_own_keywords" ON keywords FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = keywords.product_id AND products.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = keywords.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_keywords" ON keywords;
CREATE POLICY "delete_own_keywords" ON keywords FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = keywords.product_id AND products.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_keywords_product_id ON keywords(product_id);

-- ============================================================
-- 3. ranking_history 테이블 (관찰 순위 기록)
-- ============================================================
CREATE TABLE IF NOT EXISTS ranking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  keyword_id uuid NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  observed_rank integer NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ranking_history" ON ranking_history;
CREATE POLICY "select_own_ranking_history" ON ranking_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = ranking_history.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_ranking_history" ON ranking_history;
CREATE POLICY "insert_own_ranking_history" ON ranking_history FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = ranking_history.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_ranking_history" ON ranking_history;
CREATE POLICY "delete_own_ranking_history" ON ranking_history FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = ranking_history.product_id AND products.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_ranking_history_product_keyword ON ranking_history(product_id, keyword_id, recorded_at);

-- ============================================================
-- 4. competitors 테이블 (경쟁상품 스냅샷)
-- ============================================================
CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_url text,
  price integer,
  review_count integer DEFAULT 0,
  rating numeric(3,1) DEFAULT 0,
  shipping text,
  seller text,
  brand text,
  observed_rank integer,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_competitors" ON competitors;
CREATE POLICY "select_own_competitors" ON competitors FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = competitors.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_competitors" ON competitors;
CREATE POLICY "insert_own_competitors" ON competitors FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = competitors.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_competitors" ON competitors;
CREATE POLICY "update_own_competitors" ON competitors FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = competitors.product_id AND products.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = competitors.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_competitors" ON competitors;
CREATE POLICY "delete_own_competitors" ON competitors FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = competitors.product_id AND products.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_competitors_keyword_date ON competitors(keyword_id, snapshot_date);

-- ============================================================
-- 5. seo_analysis 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS seo_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title_score integer DEFAULT 0,
  category_score integer DEFAULT 0,
  brand_score integer DEFAULT 0,
  attribute_score integer DEFAULT 0,
  price_score integer DEFAULT 0,
  review_score integer DEFAULT 0,
  shipping_score integer DEFAULT 0,
  completeness_score integer DEFAULT 0,
  total_score integer DEFAULT 0,
  analysis_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seo_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seo_analysis" ON seo_analysis;
CREATE POLICY "select_own_seo_analysis" ON seo_analysis FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = seo_analysis.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_seo_analysis" ON seo_analysis;
CREATE POLICY "insert_own_seo_analysis" ON seo_analysis FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = seo_analysis.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_seo_analysis" ON seo_analysis;
CREATE POLICY "update_own_seo_analysis" ON seo_analysis FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = seo_analysis.product_id AND products.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = seo_analysis.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_seo_analysis" ON seo_analysis;
CREATE POLICY "delete_own_seo_analysis" ON seo_analysis FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = seo_analysis.product_id AND products.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_seo_analysis_product_id ON seo_analysis(product_id);

-- ============================================================
-- 6. product_changes 테이블 (변경 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  old_value text,
  new_value text,
  memo text,
  changed_at date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE product_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_product_changes" ON product_changes;
CREATE POLICY "select_own_product_changes" ON product_changes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_changes.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_product_changes" ON product_changes;
CREATE POLICY "insert_own_product_changes" ON product_changes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_changes.product_id AND products.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_product_changes" ON product_changes;
CREATE POLICY "delete_own_product_changes" ON product_changes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_changes.product_id AND products.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_product_changes_product_id ON product_changes(product_id, changed_at);

-- ============================================================
-- 7. tasks 테이블 (오늘 해야 할 일)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- ============================================================
-- 8. reports 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text DEFAULT 'weekly',
  report_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reports" ON reports;
CREATE POLICY "delete_own_reports" ON reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- ============================================================
-- 9. keyword_opportunities 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS keyword_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  search_volume integer DEFAULT 0,
  competition_count integer DEFAULT 0,
  ad_competition integer DEFAULT 0,
  my_rank integer,
  opportunity_score integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE keyword_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_keyword_opportunities" ON keyword_opportunities;
CREATE POLICY "select_own_keyword_opportunities" ON keyword_opportunities FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM keywords
      JOIN products ON products.id = keywords.product_id
      WHERE keywords.id = keyword_opportunities.keyword_id AND products.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_keyword_opportunities" ON keyword_opportunities;
CREATE POLICY "insert_own_keyword_opportunities" ON keyword_opportunities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM keywords
      JOIN products ON products.id = keywords.product_id
      WHERE keywords.id = keyword_opportunities.keyword_id AND products.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_keyword_opportunities" ON keyword_opportunities;
CREATE POLICY "update_own_keyword_opportunities" ON keyword_opportunities FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM keywords
      JOIN products ON products.id = keywords.product_id
      WHERE keywords.id = keyword_opportunities.keyword_id AND products.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM keywords
      JOIN products ON products.id = keywords.product_id
      WHERE keywords.id = keyword_opportunities.keyword_id AND products.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_keyword_opportunities" ON keyword_opportunities;
CREATE POLICY "delete_own_keyword_opportunities" ON keyword_opportunities FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM keywords
      JOIN products ON products.id = keywords.product_id
      WHERE keywords.id = keyword_opportunities.keyword_id AND products.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_keyword_opp_keyword_id ON keyword_opportunities(keyword_id);

-- ============================================================
-- 10. settings 테이블 (사용자별 설정)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  weights jsonb NOT NULL DEFAULT '{
    "title": 25,
    "category": 15,
    "brand": 10,
    "attribute": 15,
    "price": 10,
    "review": 10,
    "shipping": 10,
    "completeness": 5
  }'::jsonb,
  opportunity_weights jsonb NOT NULL DEFAULT '{
    "search_demand": 40,
    "competition": 30,
    "exposure": 30
  }'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ============================================================
-- updated_at 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();