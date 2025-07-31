import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayoutExtended from "@/components/admin/admin-layout-extended";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/admin/image-upload";
import { Slider } from "@/components/ui/slider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

const heroSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  subtitle: z.string().optional(),
  backgroundImage: z.string().min(1, "La imagen de fondo es obligatoria"),
  buttonText1: z.string().optional(),
  buttonLink1: z.string().optional(),
  buttonText2: z.string().optional(),
  buttonLink2: z.string().optional(),
  imagePosition: z.string().default("center center"),
  imageScale: z.number().min(0.5).max(2).default(1)
});

type HeroFormValues = z.infer<typeof heroSchema>;

export default function HeroPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewStyle, setPreviewStyle] = useState({});
  
  // Obtener la configuración actual de hero
  const { data: heroSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/hero'],
  });
  
  // Configurar el formulario
  const form = useForm<HeroFormValues>({
    resolver: zodResolver(heroSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      backgroundImage: "",
      buttonText1: "",
      buttonLink1: "",
      buttonText2: "",
      buttonLink2: "",
      imagePosition: "center center",
      imageScale: 1
    },
  });
  
  // Rellenar el formulario cuando se cargan los datos
  useEffect(() => {
    if (heroSettings && typeof heroSettings === 'object' && 'title' in heroSettings) {
      form.reset({
        title: (heroSettings as any).title || "",
        subtitle: (heroSettings as any).subtitle || "",
        backgroundImage: (heroSettings as any).backgroundImage || "",
        buttonText1: (heroSettings as any).buttonText1 || "",
        buttonLink1: (heroSettings as any).buttonLink1 || "",
        buttonText2: (heroSettings as any).buttonText2 || "",
        buttonLink2: (heroSettings as any).buttonLink2 || "",
        imagePosition: (heroSettings as any).imagePosition || "center center",
        imageScale: (heroSettings as any).imageScale || 1
      });
      
      updatePreview((heroSettings as any).imagePosition, (heroSettings as any).imageScale);
    }
  }, [heroSettings, form]);
  
  // Actualizar la previsualización cuando cambian los valores
  const updatePreview = (position: string, scale: number) => {
    setPreviewStyle({
      objectPosition: position,
      transform: `scale(${scale})`,
    });
  };
  
  // Manejar los cambios en la posición de la imagen
  const handlePositionChange = (value: string) => {
    const currentScale = form.getValues("imageScale");
    updatePreview(value, currentScale);
    form.setValue("imagePosition", value);
  };
  
  // Manejar los cambios en la escala de la imagen
  const handleScaleChange = (value: number[]) => {
    const scale = value[0];
    const currentPosition = form.getValues("imagePosition");
    updatePreview(currentPosition, scale);
    form.setValue("imageScale", scale);
  };
  
  // Actualizar la configuración de hero
  const updateHeroMutation = useMutation({
    mutationFn: async (data: HeroFormValues) => {
      const res = await apiRequest("PUT", "/api/admin/hero", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "La configuración de la sección Hero ha sido actualizada con éxito.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/hero'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al actualizar la configuración: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Enviar el formulario
  const onSubmit = (data: HeroFormValues) => {
    updateHeroMutation.mutate(data);
  };
  
  return (
    <AdminLayoutExtended
      title="Administrar Hero"
      description="Personaliza la primera sección que ven los visitantes"
      backButton={true}
      backButtonLink="/admin"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Título principal que aparecerá en el Hero
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtítulo</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormDescription>
                      Texto secundario que aparecerá debajo del título (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="backgroundImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen de fondo</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      La imagen que aparecerá de fondo en la sección Hero
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buttonText1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto botón 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="buttonLink1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enlace botón 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="#events" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buttonText2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto botón 2</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="buttonLink2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enlace botón 2</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="#contact" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="imagePosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posición de la imagen</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {["left top", "center top", "right top", 
                          "left center", "center center", "right center", 
                          "left bottom", "center bottom", "right bottom"].map((position) => (
                          <Button
                            key={position}
                            type="button"
                            variant={field.value === position ? "default" : "outline"}
                            onClick={() => handlePositionChange(position)}
                            className="h-10"
                          >
                            {position.replace(' ', '-')}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imageScale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escala de la imagen: {field.value.toFixed(2)}</FormLabel>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value]}
                          min={0.5}
                          max={2}
                          step={0.01}
                          onValueChange={handleScaleChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Ajusta el zoom de la imagen
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={updateHeroMutation.isPending}
                className="w-full"
              >
                {updateHeroMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </form>
          </Form>
        </div>
        
        <div>
          <Card className="p-1 overflow-hidden">
            <div className="relative h-96 overflow-hidden">
              <img 
                src={form.getValues("backgroundImage") || "/placeholder-image.jpg"} 
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-500"
                style={previewStyle}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <h2 className="text-white text-2xl font-bold mb-2">{form.getValues("title") || "Título del Hero"}</h2>
                {form.getValues("subtitle") && (
                  <p className="text-white/90 mb-4">{form.getValues("subtitle")}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {form.getValues("buttonText1") && (
                    <div className="bg-primary text-white text-sm py-2 px-4 rounded-full">
                      {form.getValues("buttonText1")}
                    </div>
                  )}
                  {form.getValues("buttonText2") && (
                    <div className="bg-white text-primary text-sm py-2 px-4 rounded-full">
                      {form.getValues("buttonText2")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
          <p className="mt-2 text-sm text-muted-foreground">Vista previa de cómo se verá la sección Hero</p>
        </div>
      </div>
    </AdminLayoutExtended>
  );
}