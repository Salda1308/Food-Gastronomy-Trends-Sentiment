from __future__ import annotations
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import dash
from dash import dcc, html, dash_table, Input, Output
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import pandas as pd

from dashboard.utils import load_latest_gold, format_timestamp, COLOR_PALETTE

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.FLATLY])
server = app.server

_PATTERN = "governance_*.parquet"


def _kpi_card(title: str, value: str, color: str = COLOR_PALETTE["ACCENT"]) -> dbc.Card:
    return dbc.Card(
        dbc.CardBody([
            html.H6(title, className="card-subtitle text-muted mb-1"),
            html.H3(value, style={"color": color, "fontWeight": "bold", "margin": 0}),
        ]),
        className="shadow-sm h-100",
    )


def _build_content(df: pd.DataFrame) -> list:
    ts = format_timestamp(_PATTERN)

    # --- KPI values ---
    total_records = int(df[df["kpi_name"] == "record_count"]["value"].sum())

    null_rows = df[df["kpi_name"] == "null_rate"]
    max_null = float(null_rows["value"].max()) if not null_rows.empty else 0.0

    dup_rows = df[df["kpi_name"] == "duplicate_rate"]
    dup_rate = float(dup_rows["value"].max()) if not dup_rows.empty else 0.0

    schema_rows = df[df["kpi_name"] == "schema_compliance_rate"]
    schema_rate = float(schema_rows["value"].min()) if not schema_rows.empty else 0.0

    null_card_color = (
        COLOR_PALETTE["NULL_HIGH"] if max_null > 80 else
        COLOR_PALETTE["NULL_MED"] if max_null > 20 else
        COLOR_PALETTE["POSITIVE"]
    )

    kpi_row = dbc.Row([
        dbc.Col(_kpi_card("Total Records", f"{total_records:,}"), width=3),
        dbc.Col(_kpi_card("Max Null Rate", f"{max_null:.1f}%", null_card_color), width=3),
        dbc.Col(_kpi_card("Duplicate Rate", f"{dup_rate:.2f}%"), width=3),
        dbc.Col(_kpi_card(
            "Schema Compliance",
            f"{schema_rate:.1f}%",
            COLOR_PALETTE["POSITIVE"] if schema_rate >= 90 else COLOR_PALETTE["NEGATIVE"],
        ), width=3),
    ], className="mb-4 g-3")

    # --- Null rate bar chart ---
    nr = df[(df["kpi_name"] == "null_rate") & (df["value"] > 0)].copy()
    nr = nr.sort_values("value", ascending=True)
    bar_colors = [
        COLOR_PALETTE["NULL_HIGH"] if v > 80 else
        COLOR_PALETTE["NULL_MED"] if v > 20 else
        COLOR_PALETTE["NULL_LOW"]
        for v in nr["value"]
    ]
    null_fig = go.Figure(go.Bar(
        x=nr["value"],
        y=nr["field"],
        orientation="h",
        marker_color=bar_colors,
        text=[f"{v:.1f}%" for v in nr["value"]],
        textposition="outside",
    ))
    null_fig.update_layout(
        title="Null Rate per Field — Silver Layer",
        xaxis_title="Null Rate (%)",
        xaxis_range=[0, 115],
        yaxis_title="Field",
        margin=dict(l=160, r=60, t=50, b=50),
        plot_bgcolor="white",
        paper_bgcolor="white",
        height=max(300, len(nr) * 28 + 80),
    )

    # --- Volume over time ---
    vol = df[df["kpi_name"] == "record_count"].copy()
    vol["date"] = vol["computed_at"].astype(str).str[:10]
    vol_grp = vol.groupby(["source", "date"])["value"].sum().reset_index()
    vol_fig = go.Figure()
    for src, color in [("api", COLOR_PALETTE["ACCENT"]), ("webscraping", COLOR_PALETTE["PRIMARY"])]:
        sub = vol_grp[vol_grp["source"] == src]
        if not sub.empty:
            vol_fig.add_trace(go.Bar(x=sub["date"], y=sub["value"], name=src, marker_color=color))
    vol_fig.update_layout(
        title="Records Ingested per Day by Source",
        barmode="group",
        xaxis_title="Date",
        yaxis_title="Records",
        plot_bgcolor="white",
        paper_bgcolor="white",
    )

    # --- Outlier rate ---
    out = df[df["kpi_name"] == "outlier_rate"].copy()
    out_fig = go.Figure(go.Bar(
        x=out["field"],
        y=out["value"],
        marker_color=COLOR_PALETTE["ACCENT"],
        text=[f"{v:.1f}%" for v in out["value"]],
        textposition="outside",
    ))
    out_fig.add_hline(
        y=10,
        line_dash="dash",
        line_color=COLOR_PALETTE["NEGATIVE"],
        annotation_text="10% threshold",
        annotation_position="top right",
    )
    out_fig.update_layout(
        title="Outlier Rate per Numeric Field (IQR Method)",
        xaxis_title="Field",
        yaxis_title="Outlier Rate (%)",
        plot_bgcolor="white",
        paper_bgcolor="white",
    )

    # --- Data quality table ---
    table_cols = ["kpi_name", "category", "source", "field", "value", "unit", "finding"]
    present = [c for c in table_cols if c in df.columns]
    table = dash_table.DataTable(
        data=df[present].to_dict("records"),
        columns=[{"name": c, "id": c} for c in present],
        page_size=15,
        sort_action="native",
        style_table={"overflowX": "auto"},
        style_header={
            "backgroundColor": COLOR_PALETTE["PRIMARY"],
            "color": "white",
            "fontWeight": "bold",
            "fontSize": "12px",
        },
        style_data_conditional=[
            {"if": {"row_index": "odd"}, "backgroundColor": "#f5f5f5"},
        ],
        style_cell={"fontSize": "12px", "padding": "6px", "textAlign": "left"},
    )

    return [
        dbc.Row(dbc.Col(html.Div([
            html.H2(
                "Empire's Taste — Data Governance Dashboard",
                style={"color": COLOR_PALETTE["PRIMARY"], "marginBottom": "4px"},
            ),
            html.Small(
                f"Team: Data Engineering  |  Last updated: {ts}",
                className="text-muted",
            ),
        ]))),
        html.Hr(),
        kpi_row,
        dbc.Row(dbc.Col(dcc.Graph(figure=null_fig)), className="mb-4"),
        dbc.Row([
            dbc.Col(dcc.Graph(figure=vol_fig), width=6),
            dbc.Col(dcc.Graph(figure=out_fig), width=6),
        ], className="mb-4"),
        dbc.Row(dbc.Col([
            html.H5("Data Quality Summary", className="mb-2"),
            table,
        ]), className="mb-4"),
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
                html.H4("No Gold governance data available", className="alert-heading"),
                html.P(str(exc)),
                html.P("Run the pipeline DAG first, then refresh this page."),
            ],
            color="warning",
            className="mt-4",
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8050, debug=False)
