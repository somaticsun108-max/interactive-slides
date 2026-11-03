"use client";

import type { SlideObject } from "@/lib/types";
import TextView from "./TextView";
import ShapeView from "./ShapeView";
import ImageView from "./ImageView";
import ClipartView from "./ClipartView";
import ButtonView from "./ButtonView";

/** Renders just the visual of an object (no interaction). */
export default function ObjectView({ obj }: { obj: SlideObject }) {
  switch (obj.type) {
    case "text":
      return obj.text ? <TextView text={obj.text} /> : null;
    case "image":
      return obj.image ? <ImageView image={obj.image} /> : null;
    case "clipart":
      return obj.clipart ? <ClipartView clipart={obj.clipart} boxW={obj.w} boxH={obj.h} /> : null;
    case "shape":
      return obj.shape ? <ShapeView shape={obj.shape} text={obj.text} /> : null;
    case "button":
      return obj.button ? <ButtonView button={obj.button} /> : null;
    default:
      return null;
  }
}
