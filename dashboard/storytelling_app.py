from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import dash
from dash import dcc, html, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import pandas as pd

from dashboard.utils import load_latest_gold, format_timestamp, COLOR_PALETTE

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.FLATLY])
server = app.server

_PATTERN = "storytelling_*.parquet"

_SENTIMENT_COLORS = {
    "positive": COLOR_PALETTE["POSITIVE"],
    "negative": COLOR_PALETTE["NEGATIVE"],
    "neutral":  COLOR_PALETTE["NEUTRAL"],
}


def _build_content(df: pd.DataFrame) -> list:
    ts = format_timestamp(_PATTERN)

    # ── 1. Sentiment Distribution (donut) ──────────────────────────────────────
    sd = df[(df["dimension_name"] == "sentiment_label") & (df["metric"] == "count")].copy()
    if sd.empty:
        donut_fig = go.Figure()
        donut_fig.add_annotation(text="No sentiment data", showarrow=False)
    else:
        labels = sd["dimension_value"].tolist()
        values = sd["value"].tolist()
        colors = [_SENTIMENT_COLORS.get(str(l).lower(), COLOR_PALETTE["NEUTRAL"]) for l in labels]

        pos_row = sd[sd["dimension_value"].str.lower() == "positive"]
        pct_positive = int(pos_row["value"].values[0]) if not pos_row.empty else 0
        total = sum(values) if values else 1
        center_text = f"{int(pct_positive / total * 100)}% Positive" if total > 0 else "—"

        donut_fig = go.Figure(go.Pie(
            labels=labels,
            values=values,
            hole=0.55,
            marker_colors=colors,
            textinfo="label+percent",
        ))
        donut_fig.update_layout(
            title="How NYC Food Media Feels This Week",
            annotations=[{
                "text": center_text,
                "x": 0.5, "y": 0.5,
                "font_size": 16,
                "showarrow": False,
            }],
            paper_bgcolor="white",
        )

    # ── 2. Sentiment Trend Line ────────────────────────────────────────────────
    st = df[(df["aggregation"] == "sentiment_trend") & (df["metric"] == "avg_sentiment")].copy()
    st["x"] = pd.to_datetime(st["dimension_value"], errors="coerce").dt.strftime("%Y-%m-%d")
    st = st.sort_values("x")
    trend_fig = go.Figure(go.Scatter(
        x=st["x"],
        y=st["value"],
        mode="lines+markers",
        marker_color=COLOR_PALETTE["POSITIVE"],
        line_color=COLOR_PALETTE["PRIMARY"],
    ))
    trend_fig.update_layout(
        title="Opinion Shifts Over Time",
        xaxis_title="Month",
        yaxis_title="Avg Compound Score",
        yaxis_range=[-1, 1],
        plot_bgcolor="white",
        paper_bgcolor="white",
    )
    if len(st) <= 1:
        trend_fig.add_annotation(
            text="More data accumulates with each daily run",
            xref="paper", yref="paper",
            x=0.5, y=0.5,
            showarrow=False,
            font_size=13,
            font_color=COLOR_PALETTE["NEUTRAL"],
        )

    # ── 3. Top Keywords Bar (colored by sentiment) ─────────────────────────────
    kw = df[df["aggregation"] == "top_keywords"].copy()
    ks = df[df["aggregation"] == "keyword_sentiment"].copy()

    # keyword text lives in `label` for top_keywords; in `dimension_value` for keyword_sentiment
    ks_map = dict(zip(ks["dimension_value"].str.lower(), ks["label"].str.lower()))
    kw = kw.sort_values("value", ascending=False).head(15).sort_values("value", ascending=True)
    kw_colors = [
        _SENTIMENT_COLORS.get(ks_map.get(str(lbl).lower(), "neutral"), COLOR_PALETTE["NEUTRAL"])
        for lbl in kw["label"]
    ]
    kw_fig = go.Figure(go.Bar(
        x=kw["value"],
        y=kw["label"],
        orientation="h",
        marker_color=kw_colors,
        text=kw["value"].astype(int).astype(str),
        textposition="outside",
    ))
    kw_fig.update_layout(
        title="Trending Ingredients & Dishes in NYC Media",
        xaxis_title="Mentions",
        yaxis_title="Food Term",
        margin=dict(l=120),
        plot_bgcolor="white",
        paper_bgcolor="white",
        height=max(300, len(kw) * 28 + 80),
    )

    # ── 4. Source Comparison Chart ─────────────────────────────────────────────
    sc = df[df["aggregation"] == "source_comparison"].copy()

    def _sc_val(source: str, metric: str) -> float:
        row = sc[(sc["dimension_value"] == source) & (sc["metric"] == metric)]
        return float(row["value"].values[0]) if not row.empty else 0.0

    web_count = _sc_val("web_articles", "record_count")
    api_count = _sc_val("api_recipes", "record_count")

    src_fig = go.Figure([
        go.Bar(
            name="Eater NY Articles",
            x=["Coverage"],
            y=[web_count],
            marker_color=COLOR_PALETTE["PRIMARY"],
            text=[int(web_count)],
            textposition="outside",
        ),
        go.Bar(
            name="Spoonacular Recipes",
            x=["Coverage"],
            y=[api_count],
            marker_color=COLOR_PALETTE["ACCENT"],
            text=[int(api_count)],
            textposition="outside",
        ),
    ])
    src_fig.update_layout(
        title="What's Being Talked About vs What's in the Kitchen",
        barmode="group",
        yaxis_title="Count",
        plot_bgcolor="white",
        paper_bgcolor="white",
    )

    # ── 5. Volume Activity Chart ───────────────────────────────────────────────
    vt = df[(df["aggregation"] == "volume_trends") & (df["metric"] == "article_count")].copy()
    vt = vt.sort_values("dimension_value")
    vol_fig = go.Figure(go.Bar(
        x=vt["dimension_value"],
        y=vt["value"],
        marker_color=COLOR_PALETTE["PRIMARY"],
        text=vt["value"].astype(int).astype(str),
        textposition="outside",
    ))
    vol_fig.update_layout(
        title="When Is NYC Food Media Most Active?",
        xaxis_title="Month",
        yaxis_title="Article Count",
        plot_bgcolor="white",
        paper_bgcolor="white",
    )

    # ── 6. Narrative Summary Card ─────────────────────────────────────────────
    try:
        top_keyword = (
            df[df["aggregation"] == "top_keywords"]
            .sort_values("value", ascending=False)
            .iloc[0]["label"]
        )
    except (IndexError, KeyError):
        top_keyword = "—"

    try:
        pct_row = df[
            (df["aggregation"] == "sentiment_distribution")
            & (df["dimension_value"].str.lower() == "positive")
            & (df["metric"] == "percentage")
        ]
        pct_pos = int(pct_row["value"].values[0]) if not pct_row.empty else 0
    except Exception:
        pct_pos = 0

    try:
        n_recipes = int(_sc_val("api_recipes", "record_count"))
    except Exception:
        n_recipes = 0

    try:
        db = df[(df["aggregation"] == "dietary_breakdown") & (df["metric"] == "count")]
        top_diet = db.sort_values("value", ascending=False).iloc[0]["label"]
    except (IndexError, KeyError):
        top_diet = "—"

    narrative = (
        f'This week, "{top_keyword}" is the most discussed food topic in NYC media, '
        f"with {pct_pos}% positive coverage. "
        f"{n_recipes} matching recipes are available in the database. "
        f"{top_diet} recipes are trending."
    )

    narrative_card = dbc.Card(
        dbc.CardBody([
            html.H5("This Week in NYC Food", className="card-title",
                    style={"color": COLOR_PALETTE["PRIMARY"]}),
            html.P(narrative, className="card-text", style={"fontSize": "1.05rem"}),
        ]),
        className="shadow-sm border-0",
        style={"backgroundColor": "#fafafa"},
    )

    # ── 7. Named Entities Card ────────────────────────────────────────────────
    ne = df[df["aggregation"] == "named_entities"].copy() if "named_entities" in df["aggregation"].values else None

    def _entity_list(entity_type: str) -> html.Ul:
        if ne is None or ne.empty:
            return html.P("No data yet — run the pipeline.", className="text-muted small")
        rows = ne[ne["dimension_value"] == entity_type].sort_values("value", ascending=False).head(5)
        if rows.empty:
            return html.P("—", className="text-muted small")
        return html.Ul([
            html.Li(f"{row['label']}  ({int(row['value'])})", style={"fontSize": "0.9rem"})
            for _, row in rows.iterrows()
        ], className="mb-0 ps-3")

    entities_card = dbc.Card(
        dbc.CardBody([
            html.H5("NYC Mentions — Who & Where", className="card-title mb-3",
                    style={"color": COLOR_PALETTE["PRIMARY"]}),
            dbc.Row([
                dbc.Col([
                    html.Strong("Restaurants", className="text-muted small d-block mb-1"),
                    _entity_list("restaurant"),
                ], width=4),
                dbc.Col([
                    html.Strong("Neighborhoods", className="text-muted small d-block mb-1"),
                    _entity_list("neighborhood"),
                ], width=4),
                dbc.Col([
                    html.Strong("Chefs", className="text-muted small d-block mb-1"),
                    _entity_list("chef"),
                ], width=4),
            ]),
        ]),
        className="shadow-sm border-0",
        style={"backgroundColor": "#fafafa"},
    )

    # ── Layout assembly ───────────────────────────────────────────────────────
    return [
        dbc.Row(dbc.Col(html.Div([
            html.H2(
                "Empire's Taste — NYC Food Trends",
                style={"color": COLOR_PALETTE["PRIMARY"], "marginBottom": "2px"},
            ),
            html.Small(
                f"Powered by Eater NY & Spoonacular  |  Last updated: {ts}",
                className="text-muted",
            ),
        ]))),
        html.Hr(),
        dbc.Row(dbc.Col(narrative_card), className="mb-4"),
        dbc.Row(dbc.Col(entities_card), className="mb-4"),
        dbc.Row([
            dbc.Col(dcc.Graph(figure=donut_fig), width=5),
            dbc.Col(dcc.Graph(figure=trend_fig), width=7),
        ], className="mb-4"),
        dbc.Row(dbc.Col(dcc.Graph(figure=kw_fig)), className="mb-4"),
        dbc.Row([
            dbc.Col(dcc.Graph(figure=src_fig), width=6),
            dbc.Col(dcc.Graph(figure=vol_fig), width=6),
        ], className="mb-4"),
    ]


app.layout = dbc.Container([
    dcc.Interval(id="interval", interval=300_000, n_intervals=0),
    html.Div(id="content"),
], fluid=True, className="py-4")


@app.callback(Output("content", "children"), Input("interval", "n_intervals"))
def refresh(_n: int):
    try:
        df = load_latest_gold(_PATTERN)
        return _build_content(df)
    except FileNotFoundError as exc:
        return dbc.Alert(
            [
                html.H4("No Gold storytelling data available", className="alert-heading"),
                html.P(str(exc)),
                html.P("Run the pipeline DAG first, then refresh this page."),
            ],
            color="warning",
            className="mt-4",
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8051, debug=False)
