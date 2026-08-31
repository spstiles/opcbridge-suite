const test = require("node:test");
const assert = require("node:assert/strict");
const { convertGraphWorx } = require("../server/graphworx-import");

const flattenObjects = (objects) => (objects || []).flatMap((object) => [object, ...(object.type === "group" ? flattenObjects(object.children) : [])]);

const fixture = `<?xml version="1.0" encoding="utf-8"?>
<Canvas Background="#FF112233" Width="800" Height="600"
 xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
 xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:gwxcmd="clr-namespace:Ico.Gwx.Commands"
 xmlns:ig="clr-namespace:Ico.Gwx.Runtime" xmlns:mwt="clr-namespace:Microsoft.Windows.Themes">
  <ig:GwxRuntimeViewControl Name="ProcessScreenControl" OriginalSource="Initial Screen.gdfx"
    Width="600" Height="450" Canvas.Left="10" Canvas.Top="20" />
  <mwt:ClassicBorderDecorator BorderStyle="Sunken" BorderThickness="2,2,2,2"
    Width="200" Height="60" Canvas.Left="50" Canvas.Top="500">
    <Rectangle Fill="#FF336699" Stroke="#FF000000" />
  </mwt:ClassicBorderDecorator>
  <Canvas Name="OverviewButton">
    <gwx:GwxDynamicGroup.GwxDynamicGroup>
      <gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList><gwx:GwxPick>
        <gwx:GwxPick.CommandParameters>
          <gwxcmd:LoadDisplayCommand FileName="Overview.gdfx" TargetType="Embedded" TargetName="ProcessScreenControl" />
        </gwx:GwxPick.CommandParameters>
      </gwx:GwxPick></gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup>
    </gwx:GwxDynamicGroup.GwxDynamicGroup>
    <Rectangle Fill="#FF4472C4" Width="160" Height="40" Canvas.Left="620" Canvas.Top="30" />
    <mwt:ClassicBorderDecorator Width="152" Height="32" Canvas.Left="624" Canvas.Top="34">
      <Rectangle Fill="#FF335599" />
    </mwt:ClassicBorderDecorator>
    <Label Foreground="#FFFFFFFF" Width="160" Height="40" Canvas.Left="620" Canvas.Top="30">
      <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxProcessPoint DataSource="ac:Plant/Overview/Status" />
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
      <TextBlock Text="Overview" />
    </Label>
  </Canvas>
</Canvas>`;

test("imports embedded GraphWorX navigation without requiring destination resources", () => {
  const result = convertGraphWorx(fixture, { filename: "Console Background.gdfx" });
  assert.equal(result.summary.imported, true);
  assert.equal(result.screen.width, 800);
  assert.equal(result.screen.background, "#112233");

  const viewport = result.screen.objects.find((object) => object.type === "viewport");
  assert.equal(viewport.id, "processscreencontrol");
  assert.equal(viewport.target, null);
  assert.equal(viewport.sourceInitialScreen, "Initial Screen.gdfx");

  const decoratedPanel = result.screen.objects.find((object) => object.source?.type === "mwt:ClassicBorderDecorator");
  assert.deepEqual(
    { x: decoratedPanel.x, y: decoratedPanel.y, w: decoratedPanel.w, h: decoratedPanel.h },
    { x: 50, y: 500, w: 200, h: 60 }
  );
  assert.equal(decoratedPanel.fill, "#336699");
  assert.equal(decoratedPanel.borderStyle, "inset");
  assert.equal(decoratedPanel.strokeWidth, 2);

  const allObjects = flattenObjects(result.screen.objects);
  const button = result.screen.objects.find((object) => object.type === "group" && object.action);
  const buttonLabel = allObjects.find((object) => object.type === "text" && object.text === "Overview");
  assert.ok(buttonLabel);
  assert.deepEqual(
    { x: button.x, y: button.y, w: button.w, h: button.h },
    { x: 620, y: 30, w: 160, h: 40 }
  );
  assert.equal(button.action.type, "load-viewport");
  assert.equal(button.action.viewportId, "processscreencontrol");
  assert.equal(button.action.screenId, null);
  assert.equal(button.action.sourceScreen, "Overview.gdfx");
  assert.equal(buttonLabel.externalReferences[0].source.value, "ac:Plant/Overview/Status");
  assert.equal(buttonLabel.externalReferences[0].target, null);
  assert.ok(result.screen.referenceHealth.issues.some((issue) => issue.category === "unsupported-automation"));
  assert.ok(result.screen.referenceHealth.issues.some((issue) => issue.category === "screen"));
  assert.ok(result.screen.objects.some((object) => object.source?.type === "mwt:ClassicBorderDecorator"));
});

test("rejects a non-GraphWorX document cleanly", () => {
  assert.throws(() => convertGraphWorx("<Document />"), /GraphWorX Canvas/);
});

test("imports a GraphWorX alarm viewer as an actionable native panel without a permanent issue", () => {
  const xml = `<Canvas Width="800" Height="600"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:ia="clr-namespace:Ico.Awx;assembly=AwxViewControl">
    <ia:AwxViewControl Width="700" Height="120" Canvas.Left="10" Canvas.Top="470" />
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Console Background.gdfx" });
  const panel = result.screen.objects[0];
  assert.equal(panel.type, "alarms-panel");
  assert.equal(panel.panelMode, "alarms");
  assert.equal(panel.importConversion, "approximated");
  assert.equal(result.screen.referenceHealth.issues.length, 0);
  assert.equal(result.summary.issues, 0);
});

test("imports embedded GraphWorX bitmap images as native image layers", () => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const xml = `<Canvas Width="800" Height="600"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:iwm="clr-namespace:Ico.Wpf.Media">
    <Image Width="800" Height="600" Canvas.Left="0" Canvas.Top="0" Stretch="Fill">
      <Image.Source><BitmapImage><iwm:BitmapImageInfo.StreamSource>
        <iwm:Base64Stream Data="${png}" />
      </iwm:BitmapImageInfo.StreamSource></BitmapImage></Image.Source>
    </Image>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Embedded Background.gdfx" });
  const image = result.screen.objects[0];
  assert.equal(image.type, "image");
  assert.match(image.src, /^graphworx-[a-f0-9]{24}\.png$/);
  assert.equal(image.fit, "fill");
  assert.deepEqual({ x: image.x, y: image.y, w: image.w, h: image.h }, { x: 0, y: 0, w: 800, h: 600 });
  assert.equal(result.embeddedAssets.length, 1);
  assert.equal(result.embeddedAssets[0].filename, image.src);
  assert.deepEqual(result.embeddedAssets[0].bytes, Buffer.from(png, "base64"));
  assert.equal(result.summary.imagesExtracted, 1);
  assert.equal(result.summary.issues, 0);
});

test("converts nested WPF gradient brushes", () => {
  const xml = `<Canvas Width="200" Height="100" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Rectangle Width="100" Height="40">
      <Rectangle.Fill><LinearGradientBrush StartPoint="0,0.5" EndPoint="1,0.5">
        <LinearGradientBrush.GradientStops>
          <GradientStop Color="#FFFF0000" Offset="0" />
          <GradientStop Color="#FF0000FF" Offset="1" />
        </LinearGradientBrush.GradientStops>
      </LinearGradientBrush></Rectangle.Fill>
    </Rectangle>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Gradient.gdfx" });
  assert.equal(result.screen.objects[0].fill, "linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
});

test("keeps brush rotation separate from the object's render transform", () => {
  const xml = `<Canvas Width="300" Height="200" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Rectangle Width="38" Height="20" Canvas.Left="100" Canvas.Top="50"
      RenderTransform="-1,0,0,-1,70,40">
      <Rectangle.Fill><LinearGradientBrush StartPoint="0,0.5" EndPoint="1,0.5">
        <LinearGradientBrush.GradientStops>
          <GradientStop Color="#FF003860" Offset="0"/><GradientStop Color="#FF0000FF" Offset="1"/>
        </LinearGradientBrush.GradientStops>
        <LinearGradientBrush.RelativeTransform><RotateTransform Angle="90" CenterX="0.5" CenterY="0.5"/></LinearGradientBrush.RelativeTransform>
      </LinearGradientBrush></Rectangle.Fill>
    </Rectangle>
  </Canvas>`;
  const rectangle = convertGraphWorx(xml, { filename: "Rotated Rectangle.gdfx" }).screen.objects[0];
  assert.deepEqual(
    { x: rectangle.x, y: rectangle.y, w: rectangle.w, h: rectangle.h, rotation: rectangle.rotation },
    { x: 132, y: 70, w: 38, h: 20, rotation: 180 }
  );
  assert.equal(rectangle.fill, "linear-gradient(180deg, #003860 0%, #0000ff 100%)");
});

test("imports an analog process point as an unresolved native text binding", () => {
  const sourceTag = "ac:Plant/Flow/FIT_100/Analog";
  const xml = `<Canvas Width="300" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Label Width="100" Height="30">
      <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxProcessPoint MaximumIntegerDigits="4" DecimalPlaces="2" PostfixLabel="gpm"
          AnimationMode="Analog" DataSource="${sourceTag}"/>
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
      <TextBlock Text="????.?? gpm"/>
    </Label>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Analog Text.gdfx" });
  const label = result.screen.objects[0];
  assert.equal(label.text, "{1} gpm");
  assert.deepEqual(label.textBindings["1"], {
    connection_id: "", tag: sourceTag, digits: 6, decimals: 2, padZeros: false,
    multiplier: 1, status: "unresolved", sourceReference: sourceTag
  });
  assert.ok(label.externalReferences.some((ref) => ref.automation === "text" && ref.status === "unresolved"));
  assert.ok(result.screen.referenceHealth.issues.some((issue) => issue.automation === "text" && issue.source.value === sourceTag));
});

test("classifies a GraphWorX analog text expression as supported but unresolved", () => {
  const source = "x={{{{ac:Building_30/PLC_Year/Analog}}}}-2000";
  const xml = `<Canvas Width="200" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Label Width="34" Height="32"><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
      <gwx:GwxProcessPoint MaximumIntegerDigits="2" DecimalPlaces="0" AnimationMode="Analog" DataSource="${source}" />
    </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup><TextBlock Text="??" /></Label>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Console Background.gdfx" });
  const object = result.screen.objects[0];
  const ref = object.externalReferences[0];
  const issue = result.screen.referenceHealth.issues[0];
  assert.equal(ref.automation, "text expression");
  assert.equal(ref.supported, true);
  assert.equal(ref.status, "unresolved");
  assert.equal(object.textBindings["1"].sourceReference, source);
  assert.equal(issue.category, "tag");
  assert.equal(issue.automation, "text expression");
  assert.equal(issue.status, "unresolved");
  assert.ok(!result.screen.referenceHealth.issues.some((entry) => entry.category === "unsupported-automation"));
});

test("bakes a polygon render transform into its points only once", () => {
  const xml = `<Canvas Width="300" Height="200" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Polygon Points="0,0 20,0 0,10" Canvas.Left="100" Canvas.Top="50"
      RenderTransform="0,1,-1,0,30,40" Fill="#FFFF0000"/>
  </Canvas>`;
  const polygon = convertGraphWorx(xml, { filename: "Rotated Polygon.gdfx" }).screen.objects[0];
  assert.deepEqual(polygon.points, [
    { x: 130, y: 90 }, { x: 130, y: 110 }, { x: 120, y: 90 }
  ]);
  assert.equal(polygon.rotation, undefined);
});

test("preserves colored equipment inside a clickable Canvas", () => {
  const xml = `<Canvas Width="300" Height="200" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:gwxcmd="clr-namespace:Ico.Gwx.Commands">
    <Canvas Name="EquipmentLink">
      <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList><gwx:GwxPick>
        <gwx:GwxPick.CommandParameters><gwxcmd:LoadDisplayCommand FileName="Equipment.gdfx" /></gwx:GwxPick.CommandParameters>
      </gwx:GwxPick></gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
      <Polygon Points="20,20 80,20 50,70" Stroke="#FF000000">
        <Polygon.Fill><LinearGradientBrush><LinearGradientBrush.GradientStops>
          <GradientStop Color="#FFFF0000" Offset="0"/><GradientStop Color="#FF00FF00" Offset="1"/>
        </LinearGradientBrush.GradientStops></LinearGradientBrush></Polygon.Fill>
      </Polygon>
      <Rectangle Width="70" Height="60" Canvas.Left="15" Canvas.Top="15" Stroke="#FFFF0000" />
    </Canvas>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Equipment.gdfx" });
  const group = result.screen.objects.find((object) => object.type === "group");
  const polygon = flattenObjects(result.screen.objects).find((object) => object.type === "polygon");
  assert.match(polygon.fill, /^linear-gradient/);
  assert.equal(group.importConversion, "preserved-group");
  assert.equal(group.action.sourceScreen, "Equipment.gdfx");
});

test("normalizes unpositioned group wrappers to their visible child bounds", () => {
  const xml = `<Canvas Width="400" Height="300" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Canvas Name="Wrapper"><Rectangle Width="80" Height="40" Canvas.Left="140" Canvas.Top="90" /></Canvas>
  </Canvas>`;
  const group = convertGraphWorx(xml, { filename: "Groups.gdfx" }).screen.objects[0];
  assert.equal(group.type, "group");
  assert.deepEqual({ x: group.x, y: group.y, w: group.w, h: group.h }, { x: 140, y: 90, w: 80, h: 40 });
  assert.deepEqual({ x: group.children[0].x, y: group.children[0].y }, { x: 0, y: 0 });
});

test("preserves unnamed coordinate wrappers around nested groups", () => {
  const xml = `<Canvas Width="400" Height="300" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Canvas Canvas.Left="50" Canvas.Top="60"><Canvas Name="Inner" Canvas.Left="10" Canvas.Top="20">
      <Rectangle Width="30" Height="20" Canvas.Left="5" Canvas.Top="7" />
    </Canvas></Canvas>
  </Canvas>`;
  const outer = convertGraphWorx(xml, { filename: "Nested Groups.gdfx" }).screen.objects[0];
  const inner = outer.children[0];
  assert.deepEqual({ x: outer.x, y: outer.y }, { x: 50, y: 60 });
  assert.deepEqual({ x: inner.x, y: inner.y }, { x: 10, y: 20 });
  assert.deepEqual({ x: inner.children[0].x, y: inner.children[0].y }, { x: 5, y: 7 });
});

test("preserves GraphWorX text alignment and multiline content", () => {
  const xml = `<Canvas Width="300" Height="200" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Label Width="120" Height="60" Canvas.Left="10" Canvas.Top="20"
      HorizontalContentAlignment="Center" VerticalContentAlignment="Center" Block.TextAlignment="Right">
      <TextBlock Text="Flow&#xD;&#xA;Rate" />
    </Label>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Text.gdfx" });
  const label = result.screen.objects[0];
  assert.equal(label.text, "Flow\nRate");
  assert.equal(label.padding, 0);
  assert.equal(label.wrapMode, "explicit");
  assert.equal(label.autoSize, false);
  assert.deepEqual({ x: label.x, y: label.y, w: label.w, h: label.h }, { x: 130, y: 50, w: 120, h: 60 });
  assert.equal(label.positionMode, "insertion-point");
  assert.equal(label.align, "right");
  assert.equal(label.valign, "middle");
});

test("does not flatten a clickable multi-box instrument panel", () => {
  const xml = `<Canvas Width="400" Height="300" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:gwxcmd="clr-namespace:Ico.Gwx.Commands"
    xmlns:mwt="clr-namespace:Microsoft.Windows.Themes">
    <Canvas Name="MeterPanel">
      <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList><gwx:GwxPick>
        <gwx:GwxPick.CommandParameters><gwxcmd:LoadDisplayCommand FileName="Calibrate.gdfx" /></gwx:GwxPick.CommandParameters>
      </gwx:GwxPick></gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
      <mwt:ClassicBorderDecorator Width="137" Height="106" Canvas.Left="20" Canvas.Top="20"><Rectangle Fill="#FFD8D8D8" /></mwt:ClassicBorderDecorator>
      <mwt:ClassicBorderDecorator Width="124" Height="37" Canvas.Left="26" Canvas.Top="42"><Rectangle Fill="#FF000000" /></mwt:ClassicBorderDecorator>
      <Label Width="130" Height="27" Canvas.Left="23" Canvas.Top="20"><TextBlock Text="METER" /></Label>
      <mwt:ClassicBorderDecorator Width="124" Height="37" Canvas.Left="26" Canvas.Top="82"><Rectangle Fill="#FF000000" /></mwt:ClassicBorderDecorator>
      <Label Width="120" Height="42" Canvas.Left="28" Canvas.Top="39"><TextBlock Text="12.3" /></Label>
      <Label Width="120" Height="42" Canvas.Left="28" Canvas.Top="79"><TextBlock Text="45.6" /></Label>
    </Canvas>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Panel.gdfx" });
  const group = result.screen.objects.find((object) => object.type === "group");
  const allObjects = flattenObjects(result.screen.objects);
  assert.equal(allObjects.filter((object) => object.type === "rect").length, 3);
  assert.equal(allObjects.filter((object) => object.type === "text").length, 3);
  assert.equal(group.action.sourceScreen, "Calibrate.gdfx");
});

test("preserves layered history buttons and imports their action", () => {
  const xml = `<Canvas Width="300" Height="120" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:gwxcmd="clr-namespace:Ico.Gwx.Commands"
    xmlns:mwt="clr-namespace:Microsoft.Windows.Themes">
    <Canvas Name="PreviousButton">
      <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList><gwx:GwxPick>
        <gwx:GwxPick.CommandParameters><gwxcmd:HistoryBackCommand /></gwx:GwxPick.CommandParameters>
      </gwx:GwxPick></gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
      <Rectangle Fill="#FFAFAFAF" Width="173" Height="75" Canvas.Left="9" Canvas.Top="9" />
      <mwt:ClassicBorderDecorator Width="165" Height="65" Canvas.Left="13" Canvas.Top="14"><Rectangle Fill="#FF8D8DFF" /></mwt:ClassicBorderDecorator>
      <Label Width="160" Height="69" Canvas.Left="15.5" Canvas.Top="12"><TextBlock Text="PREVIOUS&#xD;&#xA;SCREEN" /></Label>
    </Canvas>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "History.gdfx" });
  const allObjects = flattenObjects(result.screen.objects);
  assert.ok(allObjects.some((object) => object.type === "rect" && object.fill === "#afafaf"));
  assert.ok(allObjects.some((object) => object.type === "rect" && object.fill === "#8d8dff"));
  assert.ok(allObjects.some((object) => object.type === "text" && object.text === "PREVIOUS\nSCREEN"));
  assert.equal(result.screen.objects.find((object) => object.type === "group")?.action?.type, "history-back");
});

test("maps GraphWorX AltRaised decorators to OPCBridge outset borders", () => {
  const xml = `<Canvas Width="200" Height="100" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:mwt="clr-namespace:Microsoft.Windows.Themes">
    <mwt:ClassicBorderDecorator BorderStyle="AltRaised" BorderThickness="2,2,2,2" Width="140" Height="38">
      <Rectangle Fill="#FFCFCFCF" StrokeThickness="0" />
    </mwt:ClassicBorderDecorator>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Raised.gdfx" });
  assert.equal(result.screen.objects[0].borderStyle, "outset");
  assert.equal(result.screen.objects[0].strokeWidth, 2);
});

test("collapses a flashing bordered GraphWorX alarm label into one native text object", () => {
  const sourceTag = "ac:Plant/Alarms/HighLevel/Status";
  const xml = `<Canvas Width="800" Height="600" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:mwt="clr-namespace:Microsoft.Windows.Themes">
    <mwt:ClassicBorderDecorator BorderStyle="AltRaised" BorderThickness="2,2,2,2" Name="ClassicBorder3"
      Width="394" Height="29" Canvas.Left="200" Canvas.Top="100">
      <gwx:GwxDynamicGroup.GwxDynamicGroup><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxHide AnimationMode="Discrete" DataSource="${sourceTag}" PeriodicToggleRate="1000"
          DynamicStateWhenToggleOff="True"/>
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></gwx:GwxDynamicGroup.GwxDynamicGroup>
      <Label Background="#FFFF0000" Foreground="#FFFFFFFF" FontSize="12" FontWeight="Bold"
        HorizontalContentAlignment="Center" VerticalContentAlignment="Center" Width="390" Height="25"
        Canvas.Left="-140" Canvas.Top="14"><TextBlock Text="HIGH LEVEL ALARM"/></Label>
    </mwt:ClassicBorderDecorator>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Alarm Banner.gdfx" });
  const banner = result.screen.objects[0];
  assert.equal(result.screen.objects.length, 1);
  assert.deepEqual(
    { type: banner.type, x: banner.x, y: banner.y, w: banner.w, h: banner.h },
    { type: "text", x: 397, y: 114.5, w: 394, h: 29 }
  );
  assert.equal(banner.text, "HIGH LEVEL ALARM");
  assert.equal(banner.background, "#ff0000");
  assert.equal(banner.fill, "#ffffff");
  assert.equal(banner.bold, true);
  assert.equal(banner.borderEnabled, true);
  assert.equal(banner.borderWidth, 2);
  assert.equal(banner.borderStyle, "outset");
  assert.equal(banner.visibility.defaultVisible, true);
  assert.equal(banner.visibility.rules[0].tag, sourceTag);
  assert.equal(banner.visibility.rules[0].visible, false);
  assert.equal(banner.visibility.rules[0].flashEnabled, true);
  assert.equal(banner.visibility.rules[0].flashRate, "slow");
  assert.equal(banner.visibility.rules[0].flashWhen, true);
  assert.ok(result.screen.referenceHealth.issues.some((issue) => issue.automation === "visibility" && issue.source.value === sourceTag));
});

test("preserves a decorator child stroke as a separate native inner border", () => {
  const xml = `<Canvas Width="400" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:mwt="clr-namespace:Microsoft.Windows.Themes">
    <mwt:ClassicBorderDecorator BorderStyle="AltRaised" BorderThickness="2,2,2,2" Width="312" Height="30">
      <Rectangle Fill="#FFEB78EB" Stroke="#FF000000" StrokeThickness="3" />
    </mwt:ClassicBorderDecorator>
  </Canvas>`;
  const object = convertGraphWorx(xml, { filename: "Console Background.gdfx" }).screen.objects[0];
  assert.equal(object.borderStyle, "outset");
  assert.equal(object.strokeWidth, 2);
  assert.deepEqual(object.innerBorder, { enabled: true, color: "#000000", width: 3 });
});

test("imports GraphWorX pipes as native editable pipe objects", () => {
  const xml = `<Canvas Width="300" Height="200" Background="#FF000000"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwxctl="clr-namespace:Ico.Gwx.Controls">
    <gwxctl:GwxPipeControl Vertices="0,0 100,0 100,80" PipeThickness="12" PipeColor="#FFD3D3D3"
      JointType="Beveled" CurveRadius="10" StartCap="Flange" EndCap="Triangle" GradientSmooth="Smooth"
      Canvas.Left="20" Canvas.Top="30" />
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Pipes.gdfx" });
  const pipe = result.screen.objects[0];
  assert.equal(pipe.type, "pipe");
  assert.equal(pipe.thickness, 12);
  assert.equal(pipe.jointType, "bevel");
  assert.equal(pipe.startCap, "flange");
  assert.equal(pipe.endCap, "triangle");
  assert.equal(pipe.startCapWidth, 200);
  assert.equal(pipe.startCapLength, 50);
  assert.equal(pipe.endCapWidth, 100);
  assert.equal(pipe.endCapLength, 86.6);
  assert.equal(pipe.gradientSmooth, "smooth");
  assert.deepEqual(pipe.points, [{ x: 20, y: 30 }, { x: 120, y: 30 }, { x: 120, y: 110 }]);
});

test("maps every GraphWorX pipe cap style", () => {
  const xml = `<Canvas Width="500" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwxctl="clr-namespace:Ico.Gwx.Controls">
    <gwxctl:GwxPipeControl Vertices="0,0 50,0" StartCap="None" EndCap="Flat" />
    <gwxctl:GwxPipeControl Vertices="60,0 110,0" StartCap="Squared" EndCap="Square" />
    <gwxctl:GwxPipeControl Vertices="120,0 170,0" StartCap="Rounded" EndCap="Round" />
    <gwxctl:GwxPipeControl Vertices="180,0 230,0" StartCap="Triangular" EndCap="Triangle" />
    <gwxctl:GwxPipeControl Vertices="240,0 290,0" StartCap="Flange" EndCap="Flange" />
  </Canvas>`;
  const pipes = convertGraphWorx(xml, { filename: "Caps.gdfx" }).screen.objects.filter((object) => object.type === "pipe");
  assert.deepEqual(pipes.map((pipe) => [pipe.startCap, pipe.endCap]), [
    ["none", "flat"], ["square", "square"], ["round", "round"], ["triangle", "triangle"], ["flange", "flange"]
  ]);
});

test("creates editable unresolved automation from GraphWorX dynamics", () => {
  const xml = `<Canvas Width="200" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Rectangle Width="80" Height="40" Fill="#FF333333">
      <gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxColor TargetPropertyName="Fill" EndBrush="#FFFF0000" DataSource="ac:Plant/Pump/Running" />
        <gwx:GwxHide DataSource="x={{ac:Plant/Pump/Fault}} == 1" />
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup>
    </Rectangle>
  </Canvas>`;
  const object = convertGraphWorx(xml, { filename: "Dynamics.gdfx" }).screen.objects[0];
  assert.equal(object.fillAutomation.rules[0].tag, "ac:Plant/Pump/Running");
  assert.equal(object.fillAutomation.rules[0].status, "unresolved");
  assert.equal(object.visibility.defaultVisible, true);
  assert.equal(object.visibility.rules[0].sourceType, "expression");
  assert.equal(object.visibility.rules[0].expression, "{{ac:Plant/Pump/Fault}} == 1");
  assert.equal(object.visibility.rules[0].visible, false);
  assert.ok(object.externalReferences.some((ref) => ref.automation === "color"));
  assert.ok(object.externalReferences.some((ref) => ref.automation === "visibility"));
  assert.ok(convertGraphWorx(xml, { filename: "Dynamics.gdfx" }).screen.referenceHealth.issues.some((issue) => issue.automation === "color"));
});

test("preserves multiple GraphWorX visibility dynamics in source priority order", () => {
  const xml = `<Canvas Width="200" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Rectangle Width="80" Height="40">
      <gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxHide DataSource="ac:Plant/Pump/CommunicationsAlarm" />
        <gwx:GwxHide DataSource="ac:Plant/Pump/Running" PeriodicToggleRate="500" />
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup>
    </Rectangle>
  </Canvas>`;
  const visibility = convertGraphWorx(xml, { filename: "Visibility Priority.gdfx" }).screen.objects[0].visibility;
  assert.equal(visibility.defaultVisible, true);
  assert.deepEqual(visibility.rules.map((rule) => rule.tag), [
    "ac:Plant/Pump/CommunicationsAlarm",
    "ac:Plant/Pump/Running"
  ]);
  assert.deepEqual(visibility.rules.map((rule) => rule.visible), [false, false]);
  assert.equal(visibility.rules[1].flashEnabled, true);
  assert.equal(visibility.rules[1].flashRate, "fast");
});

test("keeps an opaque black base color when a GraphWorX color animation is present", () => {
  const xml = `<Canvas Width="500" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Label Foreground="#FF000000" Width="400" Height="40">
      <gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxColor TargetPropertyName="Foreground" EndBrush="#FFFFFFFF"
          DataSource="ac:Plant/Chlorine/ShutdownOverridden" />
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup>
      <TextBlock Text="CHLORINE SHUTDOWN&#xD;&#xA;SYSTEM OVERRIDDEN" />
    </Label>
  </Canvas>`;
  const label = convertGraphWorx(xml, { filename: "Plant Process.gdfx" }).screen.objects[0];
  assert.equal(label.fill, "#000000");
  assert.equal(label.fillAutomation.rules[0].onColor, "#ffffff");
  assert.equal(label.colorAutomationRules[0].sourceTarget, "Foreground");
});

test("imports pipe color target, color, and flashing into the editable automation rule", () => {
  const xml = `<Canvas Width="300" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx" xmlns:gwxctl="clr-namespace:Ico.Gwx.Controls">
    <gwxctl:GwxPipeControl Vertices="0,20 200,20" PipeThickness="12" PipeColor="#FF808080">
      <gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
        <gwx:GwxColor TargetPropertyName="PipeColor" EndBrush="#FF00FF00" AnimationMode="Discrete"
          DataSource="ac:Plant/Pipe/Flowing" PeriodicToggleRate="1000" />
      </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup>
    </gwxctl:GwxPipeControl>
  </Canvas>`;
  const pipe = convertGraphWorx(xml, { filename: "Pipe Automation.gdfx" }).screen.objects[0];
  const rule = pipe.colorAutomationRules[0];
  assert.equal(rule.sourceTarget, "PipeColor");
  assert.equal(rule.strokeEnabled, true);
  assert.equal(rule.strokeColor, "#00ff00");
  assert.equal(rule.flashEnabled, true);
  assert.equal(rule.flashRate, "slow");
  assert.equal(pipe.strokeAutomation.rules[0].onColor, "#00ff00");
});

test("imports analog GraphWorX size dynamics as native level automation", () => {
  const xml = `<Canvas Width="200" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Rectangle Width="80" Height="40" Fill="#FF0066CC"><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
      <gwx:GwxSize SizeVertical="True" VerticalAnchor="1" AnimationMode="Analog"
        LowLimitSource="5" HighLimitSource="25" DataSource="ac:Plant/Tank/Level" />
    </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></Rectangle>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Level.gdfx" });
  const level = result.screen.objects[0].levelAutomation;
  const ref = result.screen.objects[0].externalReferences[0];
  assert.equal(level.tag, "ac:Plant/Tank/Level");
  assert.equal(level.inputMin, 5);
  assert.equal(level.inputMax, 25);
  assert.equal(level.direction, "up");
  assert.equal(level.fill, "#0066cc");
  assert.equal(level.emptyFill, "none");
  assert.equal(level.status, "unresolved");
  assert.equal(ref.automation, "level");
  assert.equal(ref.supported, true);
  assert.equal(ref.status, "unresolved");
  assert.ok(!result.screen.referenceHealth.issues.some((issue) => issue.category === "unsupported-automation"));
});

test("keeps non-level GraphWorX size dynamics marked unsupported", () => {
  const xml = `<Canvas Width="200" Height="100" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:gwx="clr-namespace:Ico.Gwx">
    <Rectangle Width="80" Height="40"><gwx:GwxDynamicGroup><gwx:GwxDynamicGroup.DynamicsList>
      <gwx:GwxSize SizeVertical="True" AnimationMode="Discrete" DataSource="ac:Plant/Tank/Large" />
    </gwx:GwxDynamicGroup.DynamicsList></gwx:GwxDynamicGroup></Rectangle>
  </Canvas>`;
  const result = convertGraphWorx(xml, { filename: "Unsupported Size.gdfx" });
  const ref = result.screen.objects[0].externalReferences[0];
  assert.equal(ref.automation, "size");
  assert.equal(ref.supported, false);
  assert.equal(ref.status, "unsupported");
  assert.ok(result.screen.referenceHealth.issues.some((issue) => issue.category === "unsupported-automation"));
});
