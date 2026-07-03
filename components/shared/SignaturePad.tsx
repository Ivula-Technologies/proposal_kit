"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface SignaturePadHandle {
  getSignatureDataUrl: () => string | null;
}

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const canvasRef = useRef<SignatureCanvas>(null);

  function handleDrawEnd() {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      onChange(canvasRef.current.getTrimmedCanvas().toDataURL("image/png"));
    }
  }

  function handleClear() {
    canvasRef.current?.clear();
    onChange(null);
  }

  function handleTypedChange(value: string) {
    setTypedName(value);
    if (!value.trim()) {
      onChange(null);
      return;
    }
    // Render the typed name to an offscreen canvas so the server always
    // receives a PNG, matching the "draw" signature format.
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0F1A3E";
    ctx.font = "italic 48px 'Segoe Script', 'Brush Script MT', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 20, canvas.height / 2);
    onChange(canvas.toDataURL("image/png"));
  }

  return (
    <Tabs
      value={mode}
      onValueChange={(v) => {
        setMode(v as "draw" | "type");
        onChange(null);
      }}
    >
      <TabsList>
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
      </TabsList>

      <TabsContent value="draw">
        <div className="relative rounded-md border border-neutral-border bg-white">
          <SignatureCanvas
            ref={canvasRef}
            penColor="#0F1A3E"
            onEnd={handleDrawEnd}
            canvasProps={{
              className: "w-full",
              style: { minHeight: 120, height: 120 },
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-2 text-neutral-muted"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="type">
        <Input
          value={typedName}
          onChange={(e) => handleTypedChange(e.target.value)}
          placeholder="Type your full name"
          className="signature-font h-[120px] text-3xl"
        />
      </TabsContent>
    </Tabs>
  );
}
